import os
import json
import zipfile
import subprocess
from tempfile import TemporaryDirectory
from backend.core.export import decrypt_data # reusing our AES logic for .wext files

def parse_wext_file(filepath: str, password: str = "") -> dict:
    """
    Parses a .wext file which is an AES-encrypted ZIP file.
    Returns the metadata and extracts the payload.
    """
    with open(filepath, 'rb') as f:
        encrypted_data = f.read()
        
    decrypted_data = decrypt_data(encrypted_data, password)
    
    # We expect decrypted_data to be a JSON string mapping for simplicity in MVP,
    # or a binary ZIP. Let's assume it's JSON containing code and config.
    try:
        payload = json.loads(decrypted_data)
        return payload
    except Exception as e:
        raise ValueError("Invalid .wext format")

def run_extension_sandbox(python_code: str, context: dict) -> str:
    """
    Runs Python code in an isolated subprocess sandbox.
    Passes context as a JSON string to stdin, reads result from stdout.
    """
    with TemporaryDirectory() as tmpdir:
        script_path = os.path.join(tmpdir, "ext_script.py")
        with open(script_path, "w") as f:
            f.write("import sys, json\n")
            f.write("context = json.loads(sys.stdin.read())\n")
            f.write(python_code)
            f.write("\n")
            
        try:
            # Running with restricted environment variables
            env = {"PATH": "/usr/bin:/bin"} 
            result = subprocess.run(
                ["python3", script_path],
                input=json.dumps(context).encode('utf-8'),
                capture_output=True,
                timeout=5, # 5 seconds max execution
                env=env
            )
            if result.returncode == 0:
                return result.stdout.decode('utf-8')
            else:
                return f"Extension Error: {result.stderr.decode('utf-8')}"
        except subprocess.TimeoutExpired:
            return "Extension Error: Execution timed out."
        except Exception as e:
            return f"Extension Error: {str(e)}"
