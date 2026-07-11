from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from backend.database import get_db
from backend.models.models import User, Story, Chapter
from backend.core.dependencies import get_current_user
from backend.core.export import package_story

router = APIRouter()

class ExportRequest(BaseModel):
    story_id: int
    password: Optional[str] = ""
    format: str = "wstory" # wstory, pdf, epub
    selected_chapters: Optional[List[int]] = None # List of chapter IDs to include

@router.post("/generate")
def generate_export(req: ExportRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == req.story_id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    chapters = db.query(Chapter).filter(Chapter.story_id == story.id).order_by(Chapter.chapter_order).all()
    
    if req.selected_chapters:
        chapters = [c for c in chapters if c.id in req.selected_chapters]
        
    story_dict = {
        "id": story.id,
        "title": story.title,
        "summary": story.summary,
        "tags": story.tags
    }
    
    chapters_list = []
    for c in chapters:
        chapters_list.append({
            "id": c.id,
            "title": c.title,
            "content": c.content,
            "type": c.type,
            "order": c.chapter_order
        })
        
    if req.format == "wstory":
        encrypted_bytes = package_story(story_dict, chapters_list, req.password)
        return Response(
            content=encrypted_bytes, 
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={story.title.replace(' ', '_')}.wstory"}
        )
    elif req.format == "pdf":
        # Mock PDF generation for MVP
        pdf_content = f"PDF Export for {story.title}\n\n".encode('utf-8')
        for c in chapters_list:
            pdf_content += f"Chapter: {c['title']}\n".encode('utf-8')
            
        return Response(
            content=pdf_content, 
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={story.title.replace(' ', '_')}.pdf"}
        )
    elif req.format == "epub":
        # Mock EPUB generation for MVP
        epub_content = f"EPUB Export for {story.title}\n".encode('utf-8')
        return Response(
            content=epub_content, 
            media_type="application/epub+zip",
            headers={"Content-Disposition": f"attachment; filename={story.title.replace(' ', '_')}.epub"}
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")
