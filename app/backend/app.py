import os
import sys
from flask import Flask, request, jsonify, send_from_directory, render_template
import re
from collections import defaultdict
import networkx as nx


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'utils')))
from dbop import setup_database

app = Flask(__name__, static_folder="static", template_folder="templates")
app.conn = setup_database("../db", False)
 

app.filters = {
    "ReferencesSource": {
        "type": "slider",
        "on": "similarity",
        "range": [0.5, 1]
    }
}

app.schema = {
    "nodes": [
        # {
        #     "label": "Article",
        #     "derived": False,
        #     "attributes": ["id", "source", "title", "author", "publish_date"],
        # }, 
        {
            "label": "Source",
            "derived": False,
            "attributes": ["id", "name"],
        }
    ],
    "relations": [
        # {
        #     "label": "References",
        #     "from": "Article",
        #     "to": "Article",
        #     "derived": False,
        #     "weight": "similarity"
        # }, 
        # {
        #     "label": "PublishedBy",
        #     "from": "Article",
        #     "to": "Source",
        #     "derived": False
        # }, 
        {
            "label": "ReferencesSource",
            "derived": True,
            "from": "Source",
            "to": "Source",
            "weight": "count"
        }
    ]
}

@app.route('/nodes', methods=['GET'])
def get_nodes():
    return jsonify(app.schema["nodes"])

@app.route('/rels', methods=['POST'])
def get_compatible_rels():
    req = request.get_json()
    selected_nodes = req["selected_nodes"]
    rels = []
    for r in app.schema["relations"]:
        if (r["from"] in selected_nodes) and (r["to"] in selected_nodes):
            rels.append(r)
    return jsonify(rels)


@app.route('/data', methods=["POST"])
def get_data():
    req = request.get_json()
    filters = req.get("filters", {})
    configs = req.get("configs", {})
    size_metric = configs.get("node_size", "pagerank")
    color_metric = configs.get("node_color", "referenced_by_count")

    min_count = filters.get("min_edge_count", 1)
    similarity_threshold = filters.get("similarity_threshold", 0.5)

    node_index_map = {}
    nodes_output = []
    edges_output = []

    in_degree = defaultdict(int)
    out_degree = defaultdict(int)
    source_names = {}

    # First pass: build edge info and accumulate degree weights
    result = app.conn.execute("""
        MATCH (a1:Article)-[r:References]->(a2:Article),
              (a1)-[:PublishedBy]->(s1:Source),
              (a2)-[:PublishedBy]->(s2:Source)
        WHERE s1 <> s2 AND r.similarity >= $sim_thresh
        WITH s1, s2, COUNT(*) AS refCount
        WHERE refCount >= $min_count
        RETURN s1.id, s1.name, s2.id, s2.name, refCount
    """, {"sim_thresh": similarity_threshold, "min_count": min_count})

    G = nx.DiGraph()

    while result.has_next():
        s1_id, s1_name, s2_id, s2_name, count = result.get_next()

        source_names[s1_id] = s1_name
        source_names[s2_id] = s2_name

        out_degree[s1_id] += count
        in_degree[s2_id] += count

        edges_output.append({
            "label": "ReferencesSource",
            "from_id": s1_id,
            "to_id": s2_id,
            "count": count
        })

        G.add_edge(s1_id, s2_id, weight=count)

    # Compute PageRank and HITS scores
    pagerank_score = nx.pagerank(G, weight='weight') if len(G) > 0 else {}
    hits_hub, hits_auth = nx.hits(G, max_iter=1000, normalized=True) if len(G) > 0 else ({}, {})

    # Second pass: include all Source nodes even if isolated
    result = app.conn.execute("MATCH (s:Source) RETURN s.id, s.name")
    while result.has_next():
        s_id, s_name = result.get_next()
        source_names[s_id] = s_name  # ensure all names captured

    # Build nodes_output with all metrics
    for s_id, s_name in source_names.items():
        node_index_map[s_id] = len(nodes_output)
        nodes_output.append({
            "label": "Source",
            "id": s_id,
            "name": s_name,
            "referenced_by_count": in_degree.get(s_id, 0),
            "references_to_others_count": out_degree.get(s_id, 0),
            "reference_diff": out_degree.get(s_id, 0) - in_degree.get(s_id, 0),
            "pagerank": pagerank_score.get(s_id, 0),
            "hits_hub": hits_hub.get(s_id, 0),
            "hits_auth": hits_auth.get(s_id, 0)
        })

    # Update edge indices using full node list
    for edge in edges_output:
        edge["from_idx"] = node_index_map[edge.pop("from_id")]
        edge["to_idx"] = node_index_map[edge.pop("to_id")]

    return jsonify({
        "nodes": nodes_output,
        "relations": edges_output
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5002, debug=True)
