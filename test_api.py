import json
import urllib.request
import sqlite3

# login to get token
data = json.dumps({"username": "shibin", "password": "password"}).encode('utf-8')
# wait, the login is form data usually, or json depending on the app.
