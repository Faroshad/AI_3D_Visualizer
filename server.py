import os
import base64
import json
import subprocess
import threading
import time
import io
from PIL import Image
import numpy as np
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import openai

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Get API key from environment
openai.api_key = os.getenv("OPENAI_API_KEY")

# Define the Assistant ID for Retrieval
ASSISTANT_ID = "asst_TLi6n7gJh1wzhSLU8eHH1Hxi"

# Directory for saving uploaded images
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Start Vite development server on a separate thread
def start_vite_server():
    subprocess.Popen(["npm", "run", "dev"], shell=True)
    print("Vite development server started")

# Start Vite server in a separate thread
vite_thread = threading.Thread(target=start_vite_server)
vite_thread.daemon = True
vite_thread.start()

# Wait a moment for Vite to start
time.sleep(2)

def encode_image(image_path):
    """ Converts an image file to a base64-encoded string. """
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")
    except FileNotFoundError:
        return None

def retrieve_knowledge(query):
    """ Uses OpenAI Assistants API to retrieve relevant context. """
    try:
        # In older versions of the SDK, the Assistants API might not be accessible via beta
        # Let's create a simple completion instead for now
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert in architectural design and sustainability. Provide relevant information about architectural concepts that can help analyze the provided query."},
                {"role": "user", "content": query}
            ]
        )
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Retrieval Error: {str(e)}"

def validate_image(image_path):
    """
    Validates if the image contains potential building shapes by checking:
    1. If the image is not empty/all white
    2. If the image has sufficient edges/complexity
    """
    try:
        # Open and convert image to grayscale
        with Image.open(image_path) as img:
            # Convert to grayscale
            gray_img = img.convert('L')
            # Convert to numpy array
            img_array = np.array(gray_img)
            
            # Check if image is mostly empty (white/blank)
            avg_pixel_value = np.mean(img_array)
            if avg_pixel_value > 240:  # If average pixel value is very high (close to white)
                return False, "The image appears to be empty or mostly blank."
            
            # Check for variation in pixel values (indicating presence of shapes/edges)
            std_dev = np.std(img_array)
            if std_dev < 20:  # If there's very little variation in pixel values
                return False, "The image lacks sufficient detail or shapes."
            
            return True, "Image validation passed."
    except Exception as e:
        return False, f"Error validating image: {str(e)}"

def analyze_image_with_retrieval(image_path, prompt):
    """ 
    Analyzes a building from 4 perspectives using GPT-4o and retrieves 
    architectural design insights from the Assistant knowledge base.
    """
    
    # First validate the image
    is_valid, validation_message = validate_image(image_path)
    if not is_valid:
        return f"Unable to analyze: {validation_message} Please ensure the image contains clear views of the building structure."
    
    # Encode image for GPT-4o
    base64_image = encode_image(image_path)
    if not base64_image:
        return "Error: Image file not found!"
    
    # Retrieve relevant architectural knowledge
    retrieval_result = retrieve_knowledge(prompt)

    # Process retrieved knowledge if available
    retrieved_text = retrieval_result if isinstance(retrieval_result, str) else "Retrieved architectural context."

    try:
        # GPT-4o Analysis with the 4-view instruction - using older OpenAI SDK syntax
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": (
                    "You are an expert in sustainable architectural design, "
                    "analyzing buildings with technical knowledge. The image provided "
                    "shows a **single building with four different views**. "
                    "First, verify if the image shows clear building structures. "
                    "If the image is empty, unclear, or doesn't show building structures, "
                    "inform the user that you cannot provide analysis. "
                    "Otherwise, analyze the **architectural design elements, sustainability features, and functional performance** "
                    "across all four views collectively. Also, integrate retrieved architectural insights into your response."
                )},
                {"role": "user", "content": [
                    {"type": "text", "text": f"Analyze the four views of the building holistically. {prompt} \n\nAdditional Context: {retrieved_text}"},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]}
            ],
            max_tokens=700
        )
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Error analyzing image: {str(e)}"

@app.route('/')
def index():
    # Forward to Vite dev server in development mode
    return """
    <html>
        <head>
            <meta http-equiv="refresh" content="0;URL='http://localhost:3000'" />
        </head>
        <body>
            <p>Redirecting to development server...</p>
        </body>
    </html>
    """

@app.route('/api/analyze', methods=['POST'])
def analyze_building():
    try:
        data = request.json
        image_data = data.get('image')
        prompt = data.get('prompt', 'Analyze this building design.')
        
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400
        
        # Remove data URL prefix if present
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        # Save the image to a file
        image_path = os.path.join(UPLOAD_FOLDER, 'latest_capture.jpg')
        with open(image_path, 'wb') as f:
            f.write(base64.b64decode(image_data))
        
        # Analyze the image
        analysis = analyze_image_with_retrieval(image_path, prompt)
        
        return jsonify({"analysis": analysis})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message', '')
        
        if not message:
            return jsonify({"error": "No message provided"}), 400
        
        # Simple chatbot functionality - using older OpenAI SDK syntax
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant specializing in architectural design and 3D visualization."},
                {"role": "user", "content": message}
            ]
        )
        
        return jsonify({"response": response["choices"][0]["message"]["content"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"Server running on http://localhost:{port}")
    print("The application will open in your browser at http://localhost:3000")
    app.run(host='0.0.0.0', port=port, debug=True) 