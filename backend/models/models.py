from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from backend.database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    profile_photo_url = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    phone_no = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    platforms = Column(String, nullable=True)
    social_twitter = Column(String, nullable=True)
    social_insta = Column(String, nullable=True)
    social_website = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    series = relationship("Series", back_populates="owner")
    stories = relationship("Story", back_populates="owner")
    extensions = relationship("Extension", back_populates="owner")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Series(Base):
    __tablename__ = "series"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    tags = Column(String, nullable=True) # comma separated
    cover_image = Column(String, nullable=True)
    copyright_type = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    owner = relationship("User", back_populates="series")
    stories = relationship("Story", back_populates="series")

class Story(Base):
    __tablename__ = "stories"
    id = Column(Integer, primary_key=True, index=True)
    series_id = Column(Integer, ForeignKey("series.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, index=True)
    summary = Column(Text, nullable=True)
    tags = Column(String, nullable=True)
    genre = Column(String, nullable=True)
    fandom = Column(String, nullable=True)
    copyright_type = Column(String, nullable=True)
    crossover = Column(String, nullable=True)
    cover_image = Column(String, nullable=True)
    is_archived = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    owner = relationship("User", back_populates="stories")
    series = relationship("Series", back_populates="stories")
    chapters = relationship("Chapter", back_populates="story", cascade="all, delete-orphan")
    characters = relationship("Character", back_populates="story", cascade="all, delete-orphan")
    storyboards = relationship("Storyboard", back_populates="story", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="story", cascade="all, delete-orphan")
    notes = relationship("StoryNote", back_populates="story", cascade="all, delete-orphan")
    scenes = relationship("Scene", back_populates="story", cascade="all, delete-orphan")

class Character(Base):
    __tablename__ = "characters"
    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id"))
    avatar_image = Column(String, nullable=True)
    name = Column(String, index=True)
    aliases = Column(String, nullable=True)
    role = Column(String, nullable=True) # Mentor, Villain, etc.
    father_name = Column(String, nullable=True)
    mother_name = Column(String, nullable=True)
    type = Column(String, nullable=True) # protagonist, antagonist, random, side, other
    dob = Column(String, nullable=True)
    physical_description = Column(Text, nullable=True)
    personality = Column(Text, nullable=True)
    backstory = Column(Text, nullable=True)
    goals_and_motivations = Column(Text, nullable=True)
    conflicts = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    behavior = Column(Text, nullable=True)
    
    story = relationship("Story", back_populates="characters")

class Scene(Base):
    __tablename__ = "scenes"
    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id"))
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)
    timeline_event_id = Column(Integer, ForeignKey("timeline_events.id"), nullable=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    setting = Column(String, nullable=True)
    pov_character = Column(String, nullable=True)
    status = Column(String, default="Outline") # Outline, Draft, Needs Rewrite, Completed
    order_index = Column(Integer, default=0)
    
    story = relationship("Story", back_populates="scenes")
    chapter = relationship("Chapter", back_populates="scenes")

class Storyboard(Base):
    __tablename__ = "storyboards"
    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id"))
    content = Column(Text) # JSON string containing scenes, info
    
    story = relationship("Story", back_populates="storyboards")

class TimelineEvent(Base):
    __tablename__ = "timeline_events"
    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id"))
    event_date = Column(String) # could be custom calendar format
    description = Column(Text)
    importance = Column(String, nullable=True)
    
    story = relationship("Story", back_populates="timeline_events")

class StoryNote(Base):
    __tablename__ = "story_notes"
    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id"))
    title = Column(String, index=True)
    content = Column(Text, nullable=True)
    category = Column(String, default="General") # e.g., Characters, Locations, Lore
    
    story = relationship("Story", back_populates="notes")

class Chapter(Base):
    __tablename__ = "chapters"
    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id"))
    title = Column(String, index=True)
    content = Column(Text, nullable=True) # HTML/JSON from Editor
    type = Column(String, default="Standard Chapter")
    chapter_order = Column(Integer, default=0)
    
    story = relationship("Story", back_populates="chapters")
    notes = relationship("Note", back_populates="chapter", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="chapter", cascade="all, delete-orphan")
    scenes = relationship("Scene", back_populates="chapter")

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"))
    content = Column(Text)
    
    chapter = relationship("Chapter", back_populates="notes")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"))
    selected_text = Column(String)
    content = Column(Text)
    line_at = Column(Integer, nullable=True)
    line_start = Column(Integer, nullable=True)
    line_end = Column(Integer, nullable=True)
    
    chapter = relationship("Chapter", back_populates="comments")

class Extension(Base):
    __tablename__ = "extensions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    is_active = Column(Boolean, default=False)
    config_json = Column(Text, nullable=True)
    created_by = Column(String, nullable=True)
    licence = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    version = Column(String, nullable=True)
    
    owner = relationship("User", back_populates="extensions")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    type = Column(String, default="system") # system, comment, alert, etc.
    link = Column(String, nullable=True) # Optional URL to click

    user = relationship("User", back_populates="notifications")
