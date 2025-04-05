import kuzu
import globals
import os
import csv
from pathlib import Path
from dateutil import parser


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

def read_article(article_path: Path):
    '''read article into a dict entry'''
    with open(article_path, "r", errors='ignore') as file:
        article_entry = {
            c: "NULL" for c in globals.ARTICLE_COLUMNS
        }
        article_entry["articleID"] = int(article_path.stem)
        label_pattern = globals.LABEL_PATTERN
        while True: 
            line = file.readline()
            label_match = label_pattern.match(line)
            #print(label_match, line, label_pattern)
            if label_match:
                label, value = label_match.groups()
                label = label.upper()
                value = value.strip()
                if label == "SOURCE":
                    article_entry["source"] = value
                elif label == "TITLE":
                    article_entry["title"] = value
                elif label == "PUBLISHED":
                    try:
                        parsed_date = parser.parse(value, fuzzy=True, ignoretz=True)
                        date = parsed_date.strftime("%Y-%m-%d")
                        article_entry["publish_date"] = date
                    except Exception:
                        # sometimes its author in published field
                        if not article_entry["author"]:
                            article_entry["author"] = value
                elif label == "LOCATION":
                    article_entry["location"] = value
                elif label == "AUTHOR":
                    article_entry["author"] = value
            else:
                # skip empty line
                if not line.strip():
                    continue

                # possibly is isolated date
                if len(line) < 30:
                    try:
                        parsed_date = parser.parse(line, fuzzy=True)
                        date = parsed_date.strftime("%Y-%m-%d")
                        article_entry["publish_date"] = date
                        continue
                    except:
                        pass
                
                # read remaining content
                s = line.strip()
                for cline in file.readlines():
                    if cline.strip():
                        s += cline.strip()
                article_entry["content"] = s.strip()
                break

            if not line:
                break
    return article_entry


def create_news_csv():
    news_dir = Path(globals.NEWS_PATH)
    entries = []
    for source in news_dir.iterdir():
        for article in source.iterdir():
            entries.append(read_article(article))
    with open(globals.DATA_PATH + "/news_articles.csv", "w" ,newline="", encoding="utf-8") as f:
        header = globals.ARTICLE_COLUMNS
        cw = csv.DictWriter(f, header, delimiter='|', quotechar='~', quoting=csv.QUOTE_MINIMAL)
        cw.writeheader()
        cw.writerows(entries)

def init_db():
    connection = setup_database(globals.DB_PATH, delete_existing=True)
    connection.execute('''CREATE NODE TABLE Article (
                       articleID INT64,
                       source STRING, 
                       title STRING, 
                       author STRING, 
                       publish_date DATE, 
                       location STRING, 
                       content STRING,
                       PRIMARY KEY (articleID)
                        )
                       ''')
    try:
        connection.execute(f'COPY Article FROM \"{Path(globals.DATA_PATH).as_posix()}/news_articles.csv\" (HEADER=TRUE, DELIM=\"|\")')
    except Exception as e:
        print("Error during COPY execution:", e)
    result = connection.execute("MATCH (a:Article) RETURN a.title LIMIT 25")
    print(result.get_as_df())

def save_entry_to_db(connection, entry):
    pass



if __name__ == "__main__":
    create_news_csv()
    #init_db()