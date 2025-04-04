import os
from pathlib import Path
import re

BASE_PATH = str(Path(os.path.abspath(__file__)).parent.parent.as_posix())
DB_PATH = BASE_PATH + "/db"
DATA_PATH = BASE_PATH + "/data"
NEWS_PATH = DATA_PATH + "/News Articles"

ARTICLE_COLUMNS = ["articleID", "source", "title", "author", "publish_date", "location", "content"]

LABEL_PATTERN = re.compile(r'^(SOURCE|TITLE|PUBLISHED|AUTHOR|LOCATION|CONTENT)\s*:\s*(.+)', re.IGNORECASE)