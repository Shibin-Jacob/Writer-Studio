import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from main import app

for route in app.routes:
    print(f"{getattr(route, 'methods', None)} {route.path}")
