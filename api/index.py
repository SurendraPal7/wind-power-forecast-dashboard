import os
import sys

# Add the backend directory to sys.path so 'app.main' and its internal imports resolve cleanly
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(project_root, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from starlette.types import ASGIApp, Receive, Scope, Send


class VercelPathFixMiddleware:
    """
    Vercel internal rewrites rewrite the incoming URL path to the destination
    (e.g. /api/index.py or /api/index). This ASGI middleware inspects Vercel's
    request headers (x-matched-path, x-forwarded-uri, x-original-url) and
    restores the true incoming path so FastAPI routes match cleanly.
    """
    def __init__(self, inner_app: ASGIApp):
        self.inner_app = inner_app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            current_path = scope.get("path", "")
            # If path was rewritten to the handler file itself:
            if current_path in ("/api/index.py", "/api/index", "/api", "/api/index/"):
                headers = dict(scope.get("headers", []))
                # Check headers for original path
                original_path = None
                for header_name in (b"x-matched-path", b"x-forwarded-uri", b"x-original-url"):
                    val = headers.get(header_name)
                    if val:
                        decoded = val.decode("utf-8").split("?")[0]
                        if decoded and not decoded.startswith("/api/index"):
                            original_path = decoded
                            break

                if original_path:
                    scope["path"] = original_path

        await self.inner_app(scope, receive, send)


app.add_middleware(VercelPathFixMiddleware)

# Vercel serverless Python runtime exposes 'app' as the ASGI application
