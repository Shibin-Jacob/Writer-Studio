import os
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models.models import User, Series, Story, Chapter, Character, Storyboard, Comment, StoryNote, Scene, TimelineEvent
from backend.schemas import (
    SeriesCreate, SeriesResponse, 
    StoryCreate, StoryResponse, 
    ChapterCreate, ChapterResponse,
    ChapterCreateBody,
    ChapterUpdate, ChapterReorder,
    CharacterCreate, CharacterUpdate, CharacterResponse,
    StoryboardCreate, StoryboardUpdate, StoryboardResponse,
    CommentCreate, CommentResponse, CommentUpdate,
    StoryNoteCreate, StoryNoteUpdate, StoryNoteResponse,
    SceneCreate, SceneUpdate, SceneResponse,
    TimelineEventCreate, TimelineEventUpdate, TimelineEventResponse
)
from backend.core.dependencies import get_current_user

router = APIRouter()

# --- Series Endpoints ---
@router.post("/series", response_model=SeriesResponse)
def create_series(series: SeriesCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_series = Series(**series.dict(), user_id=current_user.id)
    db.add(new_series)
    db.commit()
    db.refresh(new_series)
    return new_series

@router.get("/series", response_model=List[SeriesResponse])
def get_user_series(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Series).filter(Series.user_id == current_user.id).all()

@router.put("/series/{series_id}", response_model=SeriesResponse)
def update_series(series_id: int, series: SeriesCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_series = db.query(Series).filter(Series.id == series_id, Series.user_id == current_user.id).first()
    if not db_series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    for key, value in series.dict().items():
        setattr(db_series, key, value)
        
    db.commit()
    db.refresh(db_series)
    return db_series

@router.delete("/series/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_series(series_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_series = db.query(Series).filter(Series.id == series_id, Series.user_id == current_user.id).first()
    if not db_series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    db.delete(db_series)
    db.commit()
    return None

# --- Story Endpoints ---
@router.post("/stories", response_model=StoryResponse)
def create_story(story: StoryCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_story = Story(**story.dict(), user_id=current_user.id)
    db.add(new_story)
    db.commit()
    db.refresh(new_story)
    return new_story

@router.get("/stories", response_model=List[StoryResponse])
def get_user_stories(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Story).filter(Story.user_id == current_user.id).all()

@router.get("/stories/{story_id}", response_model=StoryResponse)
def get_story(story_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story

@router.put("/stories/{story_id}", response_model=StoryResponse)
def update_story(story_id: int, story: StoryCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    for key, value in story.dict(exclude_unset=True).items():
        setattr(db_story, key, value)
        
    db.commit()
    db.refresh(db_story)
    return db_story

@router.delete("/stories/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(story_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not db_story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    db.delete(db_story)
    db.commit()
    return None

# --- Chapter Endpoints ---
@router.post("/chapters", response_model=ChapterResponse)
def create_chapter(chapter: ChapterCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify story ownership
    story = db.query(Story).filter(Story.id == chapter.story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found or unauthorized")
    
    new_chapter = Chapter(**chapter.dict())
    db.add(new_chapter)
    db.commit()
    db.refresh(new_chapter)
    return new_chapter

@router.post("/stories/{story_id}/chapters", response_model=ChapterResponse)
def create_story_chapter(story_id: int, chapter_body: ChapterCreateBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Calculate next chapter number
    chapter_count = db.query(Chapter).filter(Chapter.story_id == story_id).count()
    next_num = chapter_count + 1
    
    # Auto-generate title if not provided
    title = chapter_body.title if chapter_body.title and chapter_body.title != "New Chapter" else f"Part {next_num}"
    
    new_chapter = Chapter(
        story_id=story_id,
        title=title,
        content=chapter_body.content or "",
        chapter_order=next_num
    )
    db.add(new_chapter)
    db.commit()
    db.refresh(new_chapter)
    return new_chapter

@router.get("/stories/{story_id}/chapters", response_model=List[ChapterResponse])
def get_chapters(story_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return db.query(Chapter).filter(Chapter.story_id == story_id).order_by(Chapter.chapter_order).all()

@router.get("/chapters/{chapter_id}", response_model=ChapterResponse)
def get_chapter(chapter_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chapter = db.query(Chapter).join(Story).filter(Chapter.id == chapter_id, Story.user_id == current_user.id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@router.put("/chapters/{chapter_id}", response_model=ChapterResponse)
def update_chapter(chapter_id: int, chapter_update: ChapterUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chapter = db.query(Chapter).join(Story).filter(Chapter.id == chapter_id, Story.user_id == current_user.id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    if chapter_update.title is not None:
        chapter.title = chapter_update.title
    if chapter_update.content is not None:
        chapter.content = chapter_update.content
    if chapter_update.type is not None:
        chapter.type = chapter_update.type
        
    db.commit()
    db.refresh(chapter)
    return chapter

@router.put("/stories/{story_id}/chapters/reorder")
def reorder_chapters(story_id: int, payload: ChapterReorder, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    for index, chap_id in enumerate(payload.chapter_ids):
        # Update chapter_order to index + 1 (1-based ordering)
        db.query(Chapter).filter(Chapter.id == chap_id, Chapter.story_id == story_id).update({"chapter_order": index + 1})
        
    db.commit()
    return {"message": "Reordered successfully"}

# --- Comment Endpoints ---
@router.post("/chapters/{chapter_id}/comments", response_model=CommentResponse)
def create_comment(chapter_id: int, comment: CommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chapter = db.query(Chapter).join(Story).filter(Chapter.id == chapter_id, Story.user_id == current_user.id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    new_comment = Comment(**comment.dict(), chapter_id=chapter_id)
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

@router.get("/chapters/{chapter_id}/comments", response_model=List[CommentResponse])
def get_comments(chapter_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chapter = db.query(Chapter).join(Story).filter(Chapter.id == chapter_id, Story.user_id == current_user.id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    return db.query(Comment).filter(Comment.chapter_id == chapter_id).all()

@router.put("/comments/{comment_id}", response_model=CommentResponse)
def update_comment(comment_id: int, comment_update: CommentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    comment = db.query(Comment).join(Chapter).join(Story).filter(Comment.id == comment_id, Story.user_id == current_user.id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment.content = comment_update.content
    db.commit()
    db.refresh(comment)
    return comment

@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    comment = db.query(Comment).join(Chapter).join(Story).filter(Comment.id == comment_id, Story.user_id == current_user.id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    db.delete(comment)
    db.commit()
    return None

# --- Upload Endpoints ---
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload/image")
def upload_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    
    # Return the URL. In a real app this would be a full URL, but here we can just serve the static directory later.
    return {"url": f"/api/content/uploads/{file.filename}"}

# --- Character Endpoints ---
@router.post("/characters", response_model=CharacterResponse)
def create_character(character: CharacterCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == character.story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    new_char = Character(**character.dict())
    db.add(new_char)
    db.commit()
    db.refresh(new_char)
    return new_char

@router.get("/stories/{story_id}/characters", response_model=List[CharacterResponse])
def get_characters(story_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return db.query(Character).filter(Character.story_id == story_id).all()

@router.put("/characters/{character_id}", response_model=CharacterResponse)
def update_character(character_id: int, char_update: CharacterUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    char = db.query(Character).join(Story).filter(Character.id == character_id, Story.user_id == current_user.id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    
    for key, value in char_update.dict(exclude_unset=True).items():
        setattr(char, key, value)
        
    db.commit()
    db.refresh(char)
    return char

@router.delete("/characters/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_character(character_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    char = db.query(Character).join(Story).filter(Character.id == character_id, Story.user_id == current_user.id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    
    db.delete(char)
    db.commit()
    return None

@router.post("/characters/{character_id}/avatar")
async def upload_character_avatar(
    character_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    char = db.query(Character).join(Story).filter(Character.id == character_id, Story.user_id == current_user.id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
        
    upload_dir = Path("uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_extension = Path(file.filename).suffix
    unique_filename = f"char_{character_id}_{uuid.uuid4().hex}{file_extension}"
    file_path = upload_dir / unique_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    avatar_url = f"/api/content/uploads/{unique_filename}"
    char.avatar_image = avatar_url
    db.commit()
    
    return {"avatar_url": avatar_url}

# --- Storyboard Endpoints ---
@router.post("/storyboards", response_model=StoryboardResponse)
def create_storyboard(sb: StoryboardCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == sb.story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    new_sb = Storyboard(**sb.dict())
    db.add(new_sb)
    db.commit()
    db.refresh(new_sb)
    return new_sb

@router.get("/stories/{story_id}/storyboards", response_model=List[StoryboardResponse])
def get_storyboards(story_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return db.query(Storyboard).filter(Storyboard.story_id == story_id).all()

@router.put("/storyboards/{sb_id}", response_model=StoryboardResponse)
def update_storyboard(sb_id: int, sb_update: StoryboardUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sb = db.query(Storyboard).join(Story).filter(Storyboard.id == sb_id, Story.user_id == current_user.id).first()
    if not sb:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    
    if sb_update.content is not None:
        sb.content = sb_update.content
        
    db.commit()
    db.refresh(sb)
    return sb

# --- StoryNote Endpoints ---
@router.post("/stories/{story_id}/notes", response_model=StoryNoteResponse)
def create_story_note(story_id: int, note: StoryNoteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    new_note = StoryNote(**note.dict())
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.get("/stories/{story_id}/notes", response_model=List[StoryNoteResponse])
def get_story_notes(story_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return db.query(StoryNote).filter(StoryNote.story_id == story_id).all()

@router.put("/notes/{note_id}", response_model=StoryNoteResponse)
def update_story_note(note_id: int, note_update: StoryNoteUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.query(StoryNote).join(Story).filter(StoryNote.id == note_id, Story.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note_update.title is not None:
        note.title = note_update.title
    if note_update.content is not None:
        note.content = note_update.content
    if note_update.category is not None:
        note.category = note_update.category
        
    db.commit()
    db.refresh(note)
    return note

@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story_note(note_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.query(StoryNote).join(Story).filter(StoryNote.id == note_id, Story.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    return None

# --- Scene Endpoints ---
@router.post("/stories/{story_id}/scenes", response_model=SceneResponse)
def create_scene(story_id: int, scene: SceneCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    new_scene = Scene(**scene.dict())
    db.add(new_scene)
    db.commit()
    db.refresh(new_scene)
    return new_scene

@router.get("/stories/{story_id}/scenes", response_model=List[SceneResponse])
def get_scenes(story_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return db.query(Scene).filter(Scene.story_id == story_id).order_by(Scene.order_index).all()

@router.put("/scenes/{scene_id}", response_model=SceneResponse)
def update_scene(scene_id: int, scene_update: SceneUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scene = db.query(Scene).join(Story).filter(Scene.id == scene_id, Story.user_id == current_user.id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    for key, value in scene_update.dict(exclude_unset=True).items():
        setattr(scene, key, value)
        
    db.commit()
    db.refresh(scene)
    return scene

@router.delete("/scenes/{scene_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scene(scene_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scene = db.query(Scene).join(Story).filter(Scene.id == scene_id, Story.user_id == current_user.id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    db.delete(scene)
    db.commit()
    return None

# --- Timeline Event Endpoints ---
@router.post("/timeline", response_model=TimelineEventResponse)
def create_timeline_event(event: TimelineEventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == event.story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    new_event = TimelineEvent(**event.dict())
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

@router.get("/stories/{story_id}/timeline", response_model=List[TimelineEventResponse])
def get_timeline_events(story_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return db.query(TimelineEvent).filter(TimelineEvent.story_id == story_id).all()

@router.put("/timeline/{event_id}", response_model=TimelineEventResponse)
def update_timeline_event(event_id: int, event_update: TimelineEventUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(TimelineEvent).join(Story).filter(TimelineEvent.id == event_id, Story.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    for key, value in event_update.dict(exclude_unset=True).items():
        setattr(event, key, value)
        
    db.commit()
    db.refresh(event)
    return event

@router.delete("/timeline/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timeline_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(TimelineEvent).join(Story).filter(TimelineEvent.id == event_id, Story.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(event)
    db.commit()
    return None
