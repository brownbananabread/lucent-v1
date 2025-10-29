"""Assistant chat endpoints."""

import json
from flask import Blueprint, jsonify, request, Response, stream_with_context
from langchain_core.messages import HumanMessage, AIMessage
from src.ai.agent import LucentBot

bp = Blueprint('chat', __name__, url_prefix='/api/v1')
lucent_bot = LucentBot.with_tools()


def convert_history_to_langchain_messages(conversation_history):
    """Convert frontend message format to LangChain message objects."""
    langchain_messages = []

    for msg in conversation_history:
        role = msg.get('role')
        content = msg.get('content', '')

        if role == 'HumanMessage':
            langchain_messages.append(HumanMessage(content=content))
        elif role == 'AIMessage':
            langchain_messages.append(AIMessage(content=content))

    return langchain_messages


@bp.route('/chat', methods=['POST'])
def chat():
    """Chat with Lucent Bot using streaming."""
    data = request.get_json()

    if not data or 'message' not in data:
        return jsonify({"error": "Message is required"}), 400

    message = data['message'].strip()
    if not message:
        return jsonify({"error": "Message cannot be empty"}), 400

    # Get conversation history from request
    conversation_history = data.get('conversation_history', [])

    # Convert history to LangChain message format
    messages = convert_history_to_langchain_messages(conversation_history)

    # Add the current message
    messages.append(HumanMessage(content=message))

    def generate():
        """Generate streaming response."""
        try:
            for chunk in lucent_bot.stream({"messages": messages}):
                msg = chunk["messages"][-1]

                # Create message dict matching bot.py format
                message_dict = {
                    "content": msg.content,
                    "role": type(msg).__name__,
                    "tool_used": msg.tool_calls if hasattr(msg, "tool_calls") else None,
                }

                # Send as JSON line (same format as bot.py output)
                yield json.dumps(message_dict) + "\n"

        except Exception as e:
            error_data = {"error": str(e)}
            yield json.dumps(error_data) + "\n"

    return Response(
        stream_with_context(generate()),
        mimetype='application/json',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )
