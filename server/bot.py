from langchain_core.messages import HumanMessage
from src.ai import agent

def main():
    """Main program for testing the Bot."""
    bot = agent.LucentBot.with_tools()

    print("\nLucent Bot CLI - Type 'exit' to quit")

    while True:
        user_input = input("\nEnter your question: ").strip()

        if user_input.lower() in ['exit', 'quit', 'q']:
            print("Goodbye!")
            break

        if not user_input:
            continue

        try:
            for chunk in bot.stream({"messages": [HumanMessage(content=user_input)]}):
                message = chunk["messages"][-1] 

                message_dict = {
                    "role": type(message).__name__,
                    "content": message.content,
                    "tool_used": message.tool_calls if hasattr(message, "tool_calls") else None,
                }

                print(message_dict)
                print()
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
