# AI 3D Visualizer with Chatbot Integration

This project combines a 3D architectural model visualizer with a chatbot that can analyze the model from multiple perspectives.

## Features

- 3D model visualization with adjustable sun position
- Real astronomical calculations for realistic lighting based on time and location
- Multi-view image capture functionality
- AI-powered chatbot for architectural analysis
- OpenAI GPT-4o integration for high-quality model analysis

## Setup

### Prerequisites

- Node.js (for the frontend)
- Python 3.8+ (for the backend server)
- OpenAI API key

### Installation

1. Clone the repository

2. Install frontend dependencies:
```
npm install
```

3. Install backend dependencies:
```
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

### Running the application

1. Start the Python server:
```
python server.py
```

2. The application will be available at http://localhost:5000

## Usage

1. The 3D model will load automatically. You can rotate, pan, and zoom using the mouse.
2. Use the controls on the right side to adjust the sun's position, time of day, and location.
3. Click the green camera button to capture multiple views of the model.
4. Use the chatbot (blue icon) to ask questions about the architectural design.
5. After capturing images, you can ask the AI to analyze specific aspects of the model.

## Dependencies

### Frontend
- Three.js - 3D visualization
- lil-gui - UI controls

### Backend
- Flask - Web server
- OpenAI - AI model for chatbot and image analysis
- Python-dotenv - Environment variables management

## License

[MIT](LICENSE)
