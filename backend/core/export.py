import json
import base64
import os
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Util.Padding import pad, unpad

# A fixed salt for deriving the AES key from the password
SALT = b'writer_studio_salt_123'

def get_aes_key(password: str) -> bytes:
    """Derive a 32-byte AES key from the given password."""
    # If no password is provided, use a default system key
    if not password:
        password = "default_writer_studio_key"
    return PBKDF2(password, SALT, dkLen=32, count=1000000)

def encrypt_data(data: str, password: str) -> bytes:
    """Encrypt a string payload using AES-CBC."""
    key = get_aes_key(password)
    cipher = AES.new(key, AES.MODE_CBC)
    ct_bytes = cipher.encrypt(pad(data.encode('utf-8'), AES.block_size))
    # Prepend the IV so we can use it for decryption
    return cipher.iv + ct_bytes

def decrypt_data(encrypted_data: bytes, password: str) -> str:
    """Decrypt an AES-CBC encrypted payload."""
    key = get_aes_key(password)
    iv = encrypted_data[:16]
    ct = encrypted_data[16:]
    cipher = AES.new(key, AES.MODE_CBC, iv)
    pt = unpad(cipher.decrypt(ct), AES.block_size)
    return pt.decode('utf-8')

def package_story(story_dict: dict, chapters: list, password: str) -> bytes:
    """Package a story and its chapters into an encrypted .wstory format."""
    payload = {
        "type": "wstory",
        "story": story_dict,
        "chapters": chapters
    }
    json_data = json.dumps(payload)
    return encrypt_data(json_data, password)

def unpack_story(encrypted_bytes: bytes, password: str) -> dict:
    """Unpack an encrypted .wstory format."""
    json_data = decrypt_data(encrypted_bytes, password)
    return json.loads(json_data)
