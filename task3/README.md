# Network Graph Visualization

This project visualizes network relationships using Neo4j, Flask, and D3.js.

## Setup Instructions

1. Install Neo4j Desktop or use Neo4j Aura Cloud
   - For local installation: Download and install Neo4j Desktop from https://neo4j.com/download/
   - For Aura Cloud: Create an account at https://neo4j.com/cloud/platform/aura-graph-database/

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Configure Neo4j connection:
   - Update the URI, USERNAME, and PASSWORD in `app.py` with your Neo4j credentials
   - For local Neo4j: Default URI is usually "neo4j://localhost:7687"
   - For Aura: Use the connection string provided in your Aura console

4. Import data into Neo4j:
   - Copy the Cypher queries from `entity_graph_import.cypher`
   - Execute them in Neo4j Browser or your preferred Neo4j client

5. Run the Flask application:
```bash
python app.py
```

6. Open your browser and navigate to:
```
http://localhost:5000
```

## Features

- Interactive network graph visualization
- Force-directed layout
- Draggable nodes
- Relationship weights shown by line thickness
- Node labels 