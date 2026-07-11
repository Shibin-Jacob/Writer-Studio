import requests

# 1. Login to get token
r = requests.post("http://localhost:8000/api/auth/login", data={"username": "testuser", "password": "password"})
token = r.json().get("access_token")
if not token:
    print("Login failed, registering...")
    requests.post("http://localhost:8000/api/auth/register", json={"username": "testuser", "email": "test@test.com", "password": "password"})
    r = requests.post("http://localhost:8000/api/auth/login", data={"username": "testuser", "password": "password"})
    token = r.json().get("access_token")

headers = {"Authorization": f"Bearer {token}"}

# 2. Get stories to get a story_id
r = requests.get("http://localhost:8000/api/content/stories", headers=headers)
stories = r.json()
if not stories:
    r = requests.post("http://localhost:8000/api/content/stories", headers=headers, json={"title": "Test Story", "description": "Test", "genre": "Fiction"})
    story_id = r.json()["id"]
else:
    story_id = stories[0]["id"]

# 3. Create a character
r = requests.post("http://localhost:8000/api/content/characters", headers=headers, json={"story_id": story_id, "name": "Avatar Test Char"})
char = r.json()
char_id = char["id"]
print("Created character:", char)

# 4. Upload an avatar
files = {"file": ("test.png", b"fake_image_data", "image/png")}
r = requests.post(f"http://localhost:8000/api/content/characters/{char_id}/avatar", headers=headers, files=files)
print("Upload status:", r.status_code)
print("Upload response:", r.json())

# 5. Fetch character again
r = requests.get(f"http://localhost:8000/api/content/stories/{story_id}/characters", headers=headers)
for c in r.json():
    if c["id"] == char_id:
        print("Updated character avatar:", c.get("avatar_image"))

