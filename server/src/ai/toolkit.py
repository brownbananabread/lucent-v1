from langchain_openai import OpenAIEmbeddings
from langchain.tools.retriever import create_retriever_tool
from langchain_community.agent_toolkits import SQLDatabaseToolkit
from langchain_community.utilities import SQLDatabase
from langchain_postgres.vectorstores import PGVector
from sqlalchemy import create_engine
from src.utils import database, openai


def get_sql_tools():
    """Create SQL database tools.

    Returns:
        List of SQL database tools
    """
    # Use psycopg2 for better LangChain SQLDatabase compatibility
    url = database.get_db_url(driver="psycopg2")
    db = SQLDatabase.from_uri(url, schema="data_clean")
    llm = openai.get_llm()
    toolkit = SQLDatabaseToolkit(db=db, llm=llm)
    return toolkit.get_tools()


def get_retriever_tool():
    """Create a retriever tool from the vector store.

    Returns:
        Retriever tool for knowledge base
    """
    # Use psycopg (psycopg3) for vector store as it works better with PGVector
    engine = create_engine(database.get_db_url(driver="psycopg"))

    embeddings = OpenAIEmbeddings()
    vector_store = PGVector(
        embeddings=embeddings,
        connection=engine,
        collection_name="knowledge_base",
    )

    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 10, "score_threshold": 0.1}
    )

    return create_retriever_tool(
        retriever,
        "knowledge_base_retriever",
        """Use this tool to search the knowledge base for information from uploaded documents.
        Useful for answering questions about concepts, procedures, or information contained in text files.
        Input should be a search query related to what you want to find.
        For specific information like dates, durations, or timelines, try variations of the query.""",
    )