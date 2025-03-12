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