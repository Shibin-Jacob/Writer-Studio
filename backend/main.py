from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
from backend.routes import auth, content, export, extensions, notifications

# Initialize DB
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Writer Studio")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(auth.router, prefix="/api", tags=["auth_legacy"])
app.include_router(content.router, prefix="/api/content", tags=["content"])
# Alias for cached clients that still use /api/stories instead of /api/content/stories
app.include_router(content.router, prefix="/api", tags=["content_legacy"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(extensions.router, prefix="/api/extensions", tags=["extensions"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])

# Mount static frontend
import os
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/api/content/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
