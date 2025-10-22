import os
from pathlib import Path
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import TextLoader
from langchain_postgres.vectorstores import PGVector
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import URL, create_engine


def run(script_config=None):
    """Create vector store from .txt files in src/data."""
    txt_files = list(Path("src/data").glob("*.txt"))
    if not txt_files:
        return

    documents = []
    for txt_file in txt_files:
        loader = TextLoader(str(txt_file), encoding='utf-8')
        docs = loader.load()
        for doc in docs:
            doc.metadata['source_file'] = txt_file.name
        documents.extend(docs)

    if not documents:
        return

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    split_documents = text_splitter.split_documents(documents)

    engine = create_engine(
        URL.create(
            "postgresql+psycopg",
            username=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", 5432)),
            database=os.getenv("DB_NAME"),
        )
    )

    PGVector.from_documents(
        split_documents,
        OpenAIEmbeddings(),
        connection=engine,
        collection_name="knowledge_base",
        pre_delete_collection=True,
        create_extension=True,
    )