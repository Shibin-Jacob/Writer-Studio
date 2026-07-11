import sys
import os
import urllib.request
from datetime import timedelta

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from core.security import create_access_token

# Generate token for user 1
token = create_access_token({"sub": "1"}, timedelta(minutes=60))

# Fetch
req = urllib.request.Request("http://127.0.0.1:8000/api/stories/1", headers={'Authorization': f'Bearer {token}'})
try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"Failed with {e.code}: {e.read().decode()}")

