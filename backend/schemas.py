from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    captcha_id: Optional[str] = None
    captcha_answer: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    profile_photo_url: Optional[str] = None
    full_name: Optional[str] = None
    phone_no: Optional[str] = None
    dob: Optional[str] = None
    platforms: Optional[str] = None
    social_twitter: Optional[str] = None
    social_insta: Optional[str] = None
    social_website: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone_no: Optional[str] = None
    dob: Optional[str] = None
    platforms: Optional[str] = None
    social_twitter: Optional[str] = None
    social_insta: Optional[str] = None
    social_website: Optional[str] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class UserStats(BaseModel):
    total_stories: int
    total_series: int
    total_characters: int

# --- Series Schemas ---
class SeriesBase(BaseModel):
    title: str
    description: Optional[str] = None
    tags: Optional[str] = None
    cover_image: Optional[str] = None
    copyright_type: Optional[str] = None
    updated_at: Optional[datetime] = None

class SeriesCreate(SeriesBase):
    pass

class SeriesResponse(SeriesBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True

# --- Story Schemas ---
class StoryBase(BaseModel):
    title: str
    series_id: Optional[int] = None
    summary: Optional[str] = None
    tags: Optional[str] = None
    genre: Optional[str] = None
    fandom: Optional[str] = None
    copyright_type: Optional[str] = None
    crossover: Optional[str] = None
    cover_image: Optional[str] = None
    is_archived: Optional[bool] = False
    updated_at: Optional[datetime] = None

class StoryCreate(StoryBase):
    pass

class StoryResponse(StoryBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True

# --- Chapter Schemas ---
class ChapterBase(BaseModel):
    title: str
    content: Optional[str] = None
    type: Optional[str] = "Standard Chapter"
    chapter_order: Optional[int] = 0

class ChapterCreate(ChapterBase):
    story_id: int

class ChapterCreateBody(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None

class ChapterReorder(BaseModel):
    chapter_ids: list[int]


class ChapterResponse(ChapterBase):
    id: int
    story_id: int
    
    class Config:
        from_attributes = True

# --- Comment Schemas ---
class CommentBase(BaseModel):
    selected_text: str
    content: str
    line_at: Optional[int] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None

class CommentCreate(CommentBase):
    pass

class CommentUpdate(BaseModel):
    content: str

class CommentResponse(CommentBase):
    id: int
    chapter_id: int
    
    class Config:
        from_attributes = True

# --- Character Schemas ---
class CharacterBase(BaseModel):
    name: str
    aliases: Optional[str] = None
    role: Optional[str] = None
    avatar_image: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    type: Optional[str] = None
    dob: Optional[str] = None
    physical_description: Optional[str] = None
    personality: Optional[str] = None
    backstory: Optional[str] = None
    goals_and_motivations: Optional[str] = None
    conflicts: Optional[str] = None
    notes: Optional[str] = None
    behavior: Optional[str] = None

class CharacterCreate(CharacterBase):
    story_id: int

class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    aliases: Optional[str] = None
    role: Optional[str] = None
    avatar_image: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    type: Optional[str] = None
    dob: Optional[str] = None
    physical_description: Optional[str] = None
    personality: Optional[str] = None
    backstory: Optional[str] = None
    goals_and_motivations: Optional[str] = None
    conflicts: Optional[str] = None
    notes: Optional[str] = None
    behavior: Optional[str] = None

class CharacterResponse(CharacterBase):
    id: int
    story_id: int
    
    class Config:
        from_attributes = True

# --- Storyboard Schemas ---
class StoryboardBase(BaseModel):
    content: str # JSON string

class StoryboardCreate(StoryboardBase):
    story_id: int

class StoryboardUpdate(BaseModel):
    content: Optional[str] = None

class StoryboardResponse(StoryboardBase):
    id: int
    story_id: int
    
    class Config:
        from_attributes = True

# --- StoryNote Schemas ---
class StoryNoteBase(BaseModel):
    title: str
    content: Optional[str] = None
    category: Optional[str] = "General"
    updated_at: Optional[datetime] = None

class StoryNoteCreate(StoryNoteBase):
    story_id: int

class StoryNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None

# --- Scene Schemas ---
class SceneBase(BaseModel):
    title: str
    description: Optional[str] = None
    setting: Optional[str] = None
    pov_character: Optional[str] = None
    status: Optional[str] = "Outline"
    chapter_id: Optional[int] = None
    timeline_event_id: Optional[int] = None
    order_index: Optional[int] = 0

class SceneCreate(SceneBase):
    story_id: int

class SceneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    setting: Optional[str] = None
    pov_character: Optional[str] = None
    status: Optional[str] = None
    chapter_id: Optional[int] = None
    timeline_event_id: Optional[int] = None
    order_index: Optional[int] = None

class SceneResponse(SceneBase):
    id: int
    story_id: int
    
    class Config:
        from_attributes = True

# --- Timeline Event Schemas ---
class TimelineEventBase(BaseModel):
    title: Optional[str] = None
    event_date: Optional[str] = None
    description: Optional[str] = None
    importance: Optional[str] = None

class TimelineEventCreate(TimelineEventBase):
    story_id: int
    title: str

class TimelineEventUpdate(BaseModel):
    title: Optional[str] = None
    event_date: Optional[str] = None
    description: Optional[str] = None
    importance: Optional[str] = None

class TimelineEventResponse(TimelineEventBase):
    id: int
    story_id: int

    class Config:
        from_attributes = True

class StoryNoteResponse(StoryNoteBase):
    id: int
    story_id: int
    
    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationBase(BaseModel):
    title: str
    message: str
    type: Optional[str] = "system"
    link: Optional[str] = None
    is_read: Optional[bool] = False

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

