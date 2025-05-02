from flask import Flask, request, jsonify, render_template
import pandas as pd

app = Flask(__name__)

df = pd.read_csv("df_expanded_with_sentiment.csv")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/entities")
def get_entities():
    entities = sorted(df["entities"].dropna().unique())
    return jsonify(entities)

@app.route("/sources")
def get_sources():
    sources = sorted(df["source"].dropna().unique())
    return jsonify(sources)

@app.route("/source_data")
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

@app.route("/source_entity_heatmap")
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

@app.route("/data")
def get_data():
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
    app.run(debug=True)