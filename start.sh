#!/bin/bash

echo "Starting AI 3D Visualizer with Chatbot Integration..."
echo

# Start Python Flask server in the background
echo "Starting Python server and Vite development server..."
python server.py &
SERVER_PID=$!

# Wait a moment for the servers to start
echo "Waiting for servers to start..."
sleep 5

# Open the browser to the Vite development server
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux with xdg-open
    xdg-open http://localhost:3000 || sensible-browser http://localhost:3000 || x-www-browser http://localhost:3000 || gnome-open http://localhost:3000
fi

echo
echo "Application started!"
echo "Python API server running at http://localhost:5000"
echo "Vite development server running at http://localhost:3000"
echo
echo "Press Ctrl+C to stop the application."

# Wait for user to press Ctrl+C, then kill the server
trap "kill $SERVER_PID; echo 'Servers stopped.'; exit" INT
wait 