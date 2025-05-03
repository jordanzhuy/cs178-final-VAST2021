import kuzu
import os
import preliminary



def setup_database(db_path, delete_existing=True):
    print('Loading graph database')
    lock_file = os.path.join(db_path, ".lock")
    # Remove existing database directory if it exists
    if delete_existing and os.path.exists(db_path):
        import shutil
        print(f"Removing existing database at {db_path}")
        shutil.rmtree(db_path)
        assert not os.path.exists(db_path), f"Failed to remove {db_path}"
    elif os.path.exists(lock_file):
        print('Removing lock file')
        try:
            os.remove(lock_file)
            print(f"Removed stale lock file: {lock_file}")
        except Exception as e:
            print(f"Warning: Failed to remove lock file: {e}")
    # Create database with new directory
    db = kuzu.Database(db_path)
    connection = kuzu.Connection(db)
    return connection

def init_db():
    connection = setup_database("../db", delete_existing=True)
    connection.execute("DROP TABLE IF EXISTS ARTICLE")
    connection.execute('''CREATE NODE TABLE ARTICLE (
                       id INT64,
                       source STRING, 
                       title STRING, 
                       author STRING, 
                       publish_date DATE, 
                       location STRING, 
                       content STRING,
                       PRIMARY KEY (id)
                        )
                       ''')
    
    connection.execute(f'COPY ARTICLE FROM \"../data/news_articles.csv\" (HEADER=TRUE, DELIM=\"|\")')
    print("Articles node created from csv.")
    init_Q1(connection)


def init_Q1(conn):
    init_source_and_PublishedBy(conn)
    init_references_rel(conn)
    init_references_source_rel(conn)

def init_references_source_rel(conn):
    conn.execute("DROP TABLE IF EXISTS ReferencesSource;")
    conn.execute("""
    CREATE REL TABLE ReferencesSource(FROM Source TO Source, refCount INT64);
    """)

    conn.execute("""
    MATCH (a1:Article)-[:References]->(a2:Article),
        (a1)-[:PublishedBy]->(s1:Source),
        (a2)-[:PublishedBy]->(s2:Source)
    WHERE s1 <> s2
    WITH s1, s2, count(*) AS refCount
    CREATE (s1)-[:ReferencesSource {refCount: refCount}]->(s2);
    """)

    print("ReferencesSource relationships created.")

def init_source_and_PublishedBy(conn):
    # Drop and create the Source node + PublishedBy relationship
    conn.execute("DROP TABLE IF EXISTS PublishedBy;")
    conn.execute("DROP TABLE IF EXISTS Source;")

    conn.execute("""
    CREATE NODE TABLE Source(id INT64, name STRING, PRIMARY KEY (id));
    """)

    conn.execute("""
    CREATE REL TABLE PublishedBy(FROM Article TO Source);
    """)

    # Create unique Source nodes with generated IDs
    conn.execute("""
    MATCH (a:Article)
    WITH DISTINCT a.source AS source_name
    WITH collect(source_name) AS sources
    UNWIND range(0, size(sources)-1) AS i
    CREATE (:Source {id: i, name: sources[i+1]});
    """)

    # Create PublishedBy relationships by matching source names
    conn.execute("""
    MATCH (a:Article), (s:Source)
    WHERE a.source = s.name
    CREATE (a)-[:PublishedBy]->(s);
    """)

    print("Source nodes and PublishedBy relationships created.")

def init_references_rel(conn):
    import datetime

    conn.execute("DROP TABLE IF EXISTS REFERENCES")
    conn.execute("CREATE REL TABLE REFERENCES(FROM Article TO Article, similarity DOUBLE)")
    conn.execute("MATCH (:Article)-[r:REFERENCES]->(:Article) DELETE r;")

    similarity_matrix = preliminary.calc_sim_matrix()
    num_articles = similarity_matrix.shape[0]

    # Step 1: Get all article IDs and publish dates from Kùzu
    result = conn.execute("MATCH (a:Article) RETURN a.id, a.publish_date, a.title ORDER BY a.id")
    
    article_ids = []
    publish_dates = []
    titles = []
    while result.has_next():
        row = result.get_next()
        article_ids.append(row[0])
        publish_dates.append(row[1])  # datetime object or string (Kùzu returns ISO format)
        titles.append(row[2])

    # Step 2: Iterate and apply filtering
    for i in range(num_articles):
        for j in range(num_articles):
            if i == j:
                continue

            sim = similarity_matrix[i][j]
            if sim > preliminary.SIM_THRESHOLD and publish_dates[i] > publish_dates[j]:
                query = f"""
                MATCH (a:Article {{id: {article_ids[i]}}}), (b:Article {{id: {article_ids[j]}}})
                CREATE (a)-[:REFERENCES {{similarity: {sim:.4f}}}]->(b);
                """
                conn.execute(query)

    print("Reference relationships created.")

def save_entry_to_db(connection, entry):
    pass

if __name__ == "__main__":
    init_db()