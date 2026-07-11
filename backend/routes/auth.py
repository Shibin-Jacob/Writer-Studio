from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import shutil
import os
import hashlib
import time
import random
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.models import User, Story, Series, Character
from backend.schemas import UserCreate, UserLogin, Token, UserResponse, UserUpdate, UserPasswordUpdate, UserStats
from backend.core.security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from backend.core.dependencies import get_current_user
from datetime import timedelta

router = APIRouter()

CAPTCHA_SECRET = "writer_studio_super_secret_captcha_key"

@router.get("/captcha")
def get_captcha():
    num1 = random.randint(1, 10)
    num2 = random.randint(1, 10)
    answer = str(num1 + num2)
    timestamp = str(int(time.time()))
    captcha_hash = hashlib.sha256(f"{answer}:{timestamp}:{CAPTCHA_SECRET}".encode()).hexdigest()
    
    return {
        "question": f"What is {num1} + {num2}?",
        "captcha_id": f"{captcha_hash}:{timestamp}"
    }

@router.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    if not user.captcha_id or not user.captcha_answer:
        raise HTTPException(status_code=400, detail="Captcha is required")
    
    try:
        c_hash, timestamp_str = user.captcha_id.split(":")
        timestamp = int(timestamp_str)
        if int(time.time()) - timestamp > 300:
            raise HTTPException(status_code=400, detail="Captcha expired. Please refresh the page.")
        
        expected_hash = hashlib.sha256(f"{user.captcha_answer}:{timestamp_str}:{CAPTCHA_SECRET}".encode()).hexdigest()
        if expected_hash != c_hash:
            raise HTTPException(status_code=400, detail="Incorrect captcha answer")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid captcha format")
    user.email = user.email.lower()
    user.username = user.username.lower()
    db_user = db.query(User).filter(
        (User.email == user.email) | (User.username == user.username)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email or username already registered")
    
    hashed_pw = get_password_hash(user.password)
    new_user = User(email=user.email, username=user.username, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    user.username = user.username.lower()
    db_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.username)
    ).first()
    
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    # Format the created_at to a readable string on the frontend instead
    return current_user

@router.put("/users/me", response_model=UserResponse)
def update_user(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if update_data.username and update_data.username.lower() != current_user.username:
        # Check if username exists
        existing_user = db.query(User).filter(User.username == update_data.username.lower()).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = update_data.username.lower()
        
    if update_data.email and update_data.email.lower() != current_user.email:
        # Check if email exists
        existing_email = db.query(User).filter(User.email == update_data.email.lower()).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = update_data.email.lower()
        
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
    if update_data.phone_no is not None:
        current_user.phone_no = update_data.phone_no
    if update_data.dob is not None:
        current_user.dob = update_data.dob
    if update_data.platforms is not None:
        current_user.platforms = update_data.platforms
    if update_data.social_twitter is not None:
        current_user.social_twitter = update_data.social_twitter
    if update_data.social_insta is not None:
        current_user.social_insta = update_data.social_insta
    if update_data.social_website is not None:
        current_user.social_website = update_data.social_website
        
    db.commit()
    db.refresh(current_user)
    db.refresh(current_user)
    return current_user

@router.put("/users/me/password")
def update_password(
    password_data: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.get("/users/me/stats", response_model=UserStats)
def get_user_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stories_count = db.query(Story).filter(Story.user_id == current_user.id).count()
    series_count = db.query(Series).filter(Series.user_id == current_user.id).count()
    # Characters are tied to stories, so we join
    characters_count = db.query(Character).join(Story).filter(Story.user_id == current_user.id).count()
    
    return UserStats(
        total_stories=stories_count,
        total_series=series_count,
        total_characters=characters_count
    )

@router.post("/profile/upload")
async def upload_profile_picture(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    upload_dir = "frontend/uploads/profiles"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = file.filename.split(".")[-1]
    filename = f"user_{current_user.id}.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    current_user.profile_photo_url = f"/uploads/profiles/{filename}"
    db.commit()
    
    return {"message": "Profile picture updated successfully", "url": current_user.profile_photo_url}
