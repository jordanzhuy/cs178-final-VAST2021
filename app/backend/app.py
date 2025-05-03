import os
import sys
from flask import Flask, request, jsonify, send_from_directory, render_template
import re
from collections import defaultdict
import networkx as nx
import json
import pandas as pd

df = pd.read_csv("../data/df_expanded_with_sentiment.csv")

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'utils')))
from dbop import setup_database, init_db


app = Flask(__name__, static_folder="static", template_folder="templates")
init_db()
app.conn = setup_database("../db", False)
 

app.filters = {
    "ReferencesSource": {
        "type": "slider",
        "on": "similarity",
        "range": [0.5, 1]
    }
}


@app.route('/data', methods=["POST"])
def get_q1_data():
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

# === 解析 Cypher 文件 ===
def parse_cypher_file(filepath):
    nodes = {}
    edges = []
    current_source = None
    current_target = None

    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()

            # 解析节点
            if line.startswith("CREATE (") and "name:" in line:
                match = re.search(r'\(:([A-Z]+) \{name:\s*"([^"]+)"\}\)', line)
                if match:
                    label, name = match.groups()
                    nodes[name] = label

            # 解析MATCH行
            elif line.startswith("MATCH") and "{name:" in line:
                node_matches = re.findall(r'\{name:\s*"([^"]+)"\}', line)
                if len(node_matches) == 2:
                    current_source, current_target = node_matches
                else:
                    current_source, current_target = None, None

            # 解析CREATE关系
            elif line.startswith("CREATE") and current_source and current_target:
                weight_match = re.search(r'weight:\s*(\d+)', line)
                weight = int(weight_match.group(1)) if weight_match else 1
                edges.append((current_source, current_target, weight))
                current_source, current_target = None, None

    node_list = [{"id": name, "label": label} for name, label in nodes.items()]
    link_list = [{"source": src, "target": tgt, "weight": w} for src, tgt, w in edges]
    return {"nodes": node_list, "links": link_list}

@app.route("/graph", methods=["POST"])
def get_graph_data():
    try:
        print("Received graph data request")
        data = request.get_json()

        dataset_type = data.get("dataset", "import")  # default to import
        organization = data.get("organization", None)
        print(dataset_type)
        print(organization)
        # 选择不同的数据文件
        if dataset_type == "article":
            cypher_path = os.path.join("../data/entity_graph_article.cypher")
        else:
            cypher_path = os.path.join("../data/entity_graph_import.cypher")
        print(cypher_path)
        graph_data = parse_cypher_file(cypher_path)

        # 如果选择了组织，过滤相关节点
        if organization:
            filtered_nodes = set()
            filtered_links = []

            filtered_nodes.add(organization)
            for link in graph_data['links']:
                source = link['source']
                target = link['target']
                if source == organization or target == organization:
                    filtered_links.append(link)
                    filtered_nodes.add(source)
                    filtered_nodes.add(target)

            graph_data['nodes'] = [node for node in graph_data['nodes'] if node['id'] in filtered_nodes]
            graph_data['links'] = filtered_links

        print(f"Returning {len(graph_data['nodes'])} nodes and {len(graph_data['links'])} links")
        return jsonify(graph_data)

    except Exception as e:
        print(f"Error processing graph data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/email_graph", methods=["GET"])
def get_email_graph_data():
    try:
        print("Received email graph data request")
        json_file_path = os.path.join("../data/email_graph.json")
        with open(json_file_path, "r", encoding="utf-8") as f:
            graph_data = json.load(f)

        print(f"Returning {len(graph_data['nodes'])} nodes and {len(graph_data['links'])} links")
        return jsonify(graph_data)

    except Exception as e:
        print(f"Error processing email graph data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/status", methods=["GET"])
def api_status():
    try:
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/q2/entities")
def get_entities():
    entities = sorted(df["entities"].dropna().unique())
    return jsonify(entities)

@app.route("/q2/sources")
def get_sources():
    sources = sorted(df["source"].dropna().unique())
    return jsonify(sources)

@app.route("/q2/source_data")
def get_source_data():
    source = request.args.get("source")
    if not source:
        return jsonify([])
    filtered = df[df["source"] == source]
    # Group by entity, get mean sentiment and the first content for each entity
    pivot = (
        filtered.groupby("entities")
        .agg({"entity_sentiment": "mean", "content": "first"})
        .reset_index()
    )
    result = pivot.rename(
        columns={"entities": "x", "entity_sentiment": "y", "content": "content"}
    ).to_dict(orient="records")
    return jsonify(result)

@app.route("/q2/source_entity_heatmap")
def source_entity_heatmap():
    source = request.args.get("source")
    if not source:
        return jsonify({"entities": [], "sentiments": [], "contents": []})
    filtered = df[df["source"] == source]
    # Group by entity, get mean sentiment and the first content for each entity
    pivot = (
        filtered.groupby("entities")
        .agg({"entity_sentiment": "mean", "content": "first"})
        .reset_index()
    )
    result = {
        "entities": pivot["entities"].tolist(),
        "sentiments": pivot["entity_sentiment"].tolist(),
        "contents": pivot["content"].tolist()
    }
    return jsonify(result)

@app.route("/q2/data")
def get_q2_data():
    entity = request.args.get("entity")
    if not entity:
        return jsonify([])
    filtered = df[df["entities"] == entity]
    # Group by source, get mean sentiment and the first content for each source
    pivot = (
        filtered.groupby("source")
        .agg({"entity_sentiment": "mean", "content": "first"})
        .reset_index()
    )
    result = pivot.rename(
        columns={"source": "x", "entity_sentiment": "y", "content": "content"}
    ).to_dict(orient="records")
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5002, debug=True)
