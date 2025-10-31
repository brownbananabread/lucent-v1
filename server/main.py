import os
from flask import Flask, jsonify
from flask_cors import CORS

from src.routes import data, assistant, model

SERVER_PORT = int(os.getenv("SERVER_PORT", 5174))

app = Flask(__name__)
CORS(app, 
     supports_credentials=True, 
     origins=["http://localhost:5173"], 
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Register blueprints
app.register_blueprint(data.bp)
app.register_blueprint(assistant.bp)
app.register_blueprint(model.bp)

@app.route('/')
def home():
    """Home route"""
    return jsonify({"message": "Welcome to the API"}), 200

@app.route('/health')
def health_check():
    """Health check endpoint."""
    import datetime
    return jsonify({
        "status": "healthy", 
        "timestamp": datetime.datetime.now().isoformat()
    }), 200

@app.errorhandler(404)
def not_found(error):
    """Fallback for 404 errors"""
    return jsonify({"message": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    """Fallback for 500 errors"""
    return jsonify({"message": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=SERVER_PORT)