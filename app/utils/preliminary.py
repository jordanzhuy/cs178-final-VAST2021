import os
import pandas as pd
import numpy as np
from matplotlib import pyplot as plt
import string
from sklearn.metrics.pairwise import cosine_similarity

SIM_THRESHOLD = 0.5

def calc_sim_matrix():
    articles_df = pd.read_csv("../data/news_articles.csv", encoding="utf-8", sep="|", parse_dates=["publish_date"])
    articles_df.set_index("id", inplace=True)
    articles_df.sort_index(inplace=True)

    sources = articles_df["source"].unique()# split the words of content
    articles_df["words"] = articles_df["content"].apply(lambda x: np.array(x.lower().translate(str.maketrans(string.punctuation, " "*len(string.punctuation))).split()))
    vocab = np.unique(np.concatenate(articles_df["words"].values))
    n_articles = len(articles_df)
    n_vocab = len(vocab)
    n_source = len(sources)

    word_index = {str(word): idx for idx, word in enumerate(vocab)}
    tf = np.zeros((len(articles_df), len(vocab)))

    for doc_idx, doc in enumerate(articles_df["words"].values):
        for word in doc:
            tf[doc_idx, word_index[word]] += 1
        tf[doc_idx] /= len(doc)  # normalize by total words in doc

    df = np.count_nonzero(tf > 0, axis=0)  # doc freq per term
    idf = np.log(n_articles / (df + 1e-10))

    tf_idf = tf * idf

    similarity_matrix = cosine_similarity(tf_idf)
    return similarity_matrix
