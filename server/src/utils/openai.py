"""LLM utilities for the application."""

from langchain_openai import ChatOpenAI


def get_llm(model: str = "gpt-4o", temperature: float = 0):
    """Get a configured LLM instance.

    Args:
        model: The model name to use
        temperature: The temperature setting for the model

    Returns:
        Configured ChatOpenAI instance
    """
    return ChatOpenAI(model=model, temperature=temperature)
