import os
import re
import json
from flask import Flask, request, jsonify, send_from_directory, render_template

app = Flask(__name__, static_folder="static", template_folder="templates")

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


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory("frontend", path)


@app.route("/api/graph", methods=["POST"])
def get_graph_data():
    try:
        print("Received graph data request")
        data = request.get_json()

        dataset_type = data.get("dataset", "import")  # default to import
        organization = data.get("organization", None)

        # 选择不同的数据文件
        if dataset_type == "article":
            cypher_path = os.path.join(os.path.dirname(__file__), "data/entity_graph_article.cypher")
        else:
            cypher_path = os.path.join(os.path.dirname(__file__), "data/entity_graph_import.cypher")

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


@app.route("/api/email_graph", methods=["GET"])
def get_email_graph_data():
    try:
        print("Received email graph data request")
        json_file_path = os.path.join(os.path.dirname(__file__), "data/email_graph.json")
        with open(json_file_path, "r", encoding="utf-8") as f:
            graph_data = json.load(f)

        print(f"Returning {len(graph_data['nodes'])} nodes and {len(graph_data['links'])} links")
        return jsonify(graph_data)

    except Exception as e:
        print(f"Error processing email graph data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/status", methods=["GET"])
def api_status():
    try:
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
