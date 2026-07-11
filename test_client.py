import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

# Test if we get 401 (meaning the endpoint exists and expects auth)
response = client.get("/api/stories/1")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
