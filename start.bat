@echo off
echo Starting AI 3D Visualizer with Chatbot Integration...
echo.

REM Start Python Flask server
start cmd /k "echo Starting Python server and Vite development server... & python server.py"

REM Wait a moment for the servers to start
timeout /t 5 /nobreak > nul

REM Open the browser to the Vite development server
start http://localhost:3000

echo.
echo Application started!
echo Python API server running at http://localhost:5000
echo Vite development server running at http://localhost:3000
echo.
echo Press Ctrl+C in the server window to stop the application. 