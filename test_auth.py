from backend.core.security import get_password_hash, verify_password

def test():
    plain = "mysecretpassword123!"
    hashed = get_password_hash(plain)
    print(f"Hashed: {hashed}")
    result = verify_password(plain, hashed)
    print(f"Verify exact: {result}")
    
    result_wrong = verify_password("wrong", hashed)
    print(f"Verify wrong: {result_wrong}")

if __name__ == "__main__":
    test()
