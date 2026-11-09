import os
import sys

# Add the backend directory to sys.path so 'app.main' and its internal imports resolve cleanly
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(project_root, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

# Vercel serverless Python runtime exposes 'app' as the ASGI application
