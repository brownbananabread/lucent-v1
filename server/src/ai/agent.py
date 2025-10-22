from langgraph.prebuilt import create_react_agent

from src.utils import openai
from src.ai import toolkit

from langchain.schema import HumanMessage
from typing import Any
from datetime import datetime

_AGENT = None

SYSTEM_PROMPT = """You are Lucent Bot, a helpful mining data assistant with access to both a PostgreSQL database and a knowledge base.

You have access to:
1. A SQL database with mining data in the data_clean schema
2. A knowledge base with embedded documents from text files

Use the appropriate tool based on the question:
- For factual data queries about specific mines, companies, or statistics, use the SQL database tools
- For conceptual questions, procedures, project timelines, sprint information, or general information from documents, use the knowledge_base_retriever
- For questions about sprint durations, project phases, or development timelines, always check the knowledge_base_retriever first

Your process for database queries should be:
1. First, use sql_db_list_tables to see what tables are available
2. Then, use sql_db_schema to examine the structure and sample data of relevant tables
3. Write and execute a SQL query using sql_db_query to get the data
4. Use sql_db_query_checker if you want to validate a complex query before running it

You have access to mining data in the data_clean schema with tables containing information about:
- Mining companies (dim_company)
- Energy data (dim_energy)
- Evaluations (dim_evaluations)
- Mine identification (dim_identification)
- Location data (dim_locations)
- Data sources (dim_sources)
- Spatial information (dim_spatial)
- Status information (dim_status)
- Commodity facts (fact_commodities)
- Documentation (fact_documentation)
- Shaft information (fact_shafts)

ONLY use ONE tool at a time. Always explain your reasoning and provide clear, helpful responses.

The time is {current_time}."""


class LucentBot:
    """Lucent Bot for mining data queries."""

    def __init__(self, llm: Any, tools: list[Any]) -> None:
        self._llm = llm
        self._tools = tools

        system_prompt = SYSTEM_PROMPT.format(
            current_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

        self._agent = create_react_agent(
            self._llm, self._tools, prompt=system_prompt
        )

    @classmethod
    def with_tools(cls) -> "LucentBot":
        global _AGENT
        
        if _AGENT is None:
            llm = openai.get_llm(model="gpt-5-mini", temperature=0)
            sql_tools = toolkit.get_sql_tools()
            retriever_tool = toolkit.get_retriever_tool()
            tools = sql_tools + [retriever_tool]
            _AGENT = cls(llm, tools)

        return _AGENT
    
    def stream(self, message: dict):
        """Stream responses from the agent."""
        yield from self._agent.stream(message, stream_mode="values")