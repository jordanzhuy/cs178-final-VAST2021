import os
import csv
from pathlib import Path
from dateutil import parser
import re

ARTICLE_COLUMNS = ["id", "source", "title", "author", "publish_date", "location", "content"]
NEWS_LABEL_PATTERN = re.compile(r'^(SOURCE|TITLE|PUBLISHED|AUTHOR|LOCATION|CONTENT)\s*:\s*(.+)', re.IGNORECASE)

def parse_line(line, article_entry):
    '''
    parse single line in news article and save relavant info in article_entry. 
    return true if start of content.
    '''
    label_pattern = NEWS_LABEL_PATTERN
    label_match = label_pattern.match(line)
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
        return False
    else:
        # skip empty line
        if not line.strip():
            return False
        # possibly is isolated date
        if len(line) < 30:
            try:
                parsed_date = parser.parse(line, fuzzy=True)
                date = parsed_date.strftime("%Y-%m-%d")
                article_entry["publish_date"] = date
                return False
            except:
                return False
        return True
                
def read_article(article_path: Path):
    '''read article into a dict entry'''
    with open(article_path, "r", errors='ignore') as file:
        article_entry = {
            c: "NULL" for c in ARTICLE_COLUMNS
        }
        article_entry["id"] = int(article_path.stem)
        label_pattern = NEWS_LABEL_PATTERN
        while True: 
            line = file.readline()
            if not line: # at eof
                break
            if (parse_line(line, article_entry)): # parse each line into entry until start of content
                # read remaining content
                s = line.strip()
                for cline in file.readlines():
                    cstriped = cline.strip()
                    if cstriped:
                        s += cstriped
                article_entry["content"] = s.strip()
                # end of content, stop reading
                break

    return article_entry


def create_news_csv():
    news_dir = "../data/News Articles"
    entries = []
    for source in Path(news_dir).iterdir():
        for article in source.iterdir():
            entries.append(read_article(article))
    with open("../data/news_articles.csv", "w" ,newline="", encoding="utf-8") as f:
        header = ARTICLE_COLUMNS
        cw = csv.DictWriter(f, header, delimiter='|', quotechar='~', quoting=csv.QUOTE_MINIMAL)
        cw.writeheader()
        cw.writerows(entries)
    print(f"Created news_articles.csv at ../data/news_articles.csv")


if __name__ == "__main__":
    create_news_csv()
    #init_db()