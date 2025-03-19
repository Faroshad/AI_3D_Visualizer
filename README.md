<<<<<<< HEAD
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
=======
<<<<<<< HEAD
# AI 3D Model Visualizer

A high-performance 3D model viewer built with Three.js that provides a clean, clay-like visualization with edge detection and optimized shadows.

## Features

- Clay material rendering with edge detection
- Optimized shadow mapping
- Three-point lighting system
- Smooth camera controls
- Performance-optimized rendering
- Responsive design
- Model auto-centering and scaling

## Setup

1. Clone the repository:
```bash
git clone https://github.com/Faroshad/AI_3D_Visualizer.git
cd AI_3D_Visualizer
```

2. Install dependencies:
```bash
npm install
```

3. Place your 3D models in the `models` directory (supports .obj files)

4. Start the development server:
```bash
npm run dev
```

## Controls

- Left Mouse Button: Rotate the model
- Right Mouse Button: Pan the view
- Mouse Wheel: Zoom in/out

## Technical Details

- Built with Three.js and Vite
- Implements PCFSoft shadow mapping
- Uses EdgesGeometry for edge detection
- Optimized for performance with render throttling
- Responsive window handling

## Project Structure

```
AI_3D_Visualizer/
├── src/
│   └── main.js
├── models/
│   └── House.obj
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Requirements

- Node.js 14+
- Modern web browser with WebGL support

## License

MIT License - see LICENSE file for details 
=======
# AI_3D_Visualizer
>>>>>>> b2e07cfb8702514f77f83a7ab0c906a18587a6ed
>>>>>>> 3e920a72e8cedb72cae1486648f793e4619bdb6a
