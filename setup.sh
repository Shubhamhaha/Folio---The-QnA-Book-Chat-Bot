#!/bin/bash
# Quick start script for Book Intelligence Platform

set -e

echo ""
echo "📚 Book Intelligence Platform — Setup"
echo "======================================"

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required. Install from https://python.org"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }

# --- Backend ---
echo ""
echo "🔧 Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "   ✅ Virtual environment created"
fi

source venv/bin/activate
pip install -r requirements.txt -q
echo "   ✅ Python packages installed"

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   ⚠️  .env file created — please add your API keys!"
    echo "      Edit backend/.env and add GEMINI_API_KEY or GROQ_API_KEY"
fi

cd ..

# --- Frontend ---
echo ""
echo "🎨 Setting up frontend..."
cd frontend
npm install --silent
echo "   ✅ Node packages installed"
cd ..

echo ""
echo "======================================"
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo ""
echo "  Terminal 1 (backend):"
echo "    cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000"
echo ""
echo "  Terminal 2 (frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Then open: http://localhost:5173"
echo ""
echo "  Don't forget to edit backend/.env with your API keys!"
echo ""
