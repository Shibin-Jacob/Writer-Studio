from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
import shutil
import os

from backend.database import get_db
from backend.models.models import User, Extension
from backend.core.dependencies import get_current_user
from backend.core.extensions import parse_wext_file, run_extension_sandbox

router = APIRouter()

class RunExtensionRequest(BaseModel):
    extension_id: int
    context_data: dict

@router.get("/")
def list_extensions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    extensions = db.query(Extension).filter(Extension.user_id == current_user.id).all()
    return extensions

@router.post("/upload")
async def upload_extension(
    file: UploadFile = File(...), 
    password: str = "", 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".wext"):
        raise HTTPException(status_code=400, detail="Only .wext files are supported")
        
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Parse payload
        payload = parse_wext_file(temp_path, password)
        name = payload.get("name", "Untitled Extension")
        description = payload.get("description", "")
        code = payload.get("code", "")
        
        # Save to DB
        new_ext = Extension(
            name=name,
            description=description,
            code=code,
            is_active=True,
            user_id=current_user.id
        )
        db.add(new_ext)
        db.commit()
        db.refresh(new_ext)
        return {"message": "Extension installed successfully", "extension": new_ext}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to install extension: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/run")
def run_extension(req: RunExtensionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ext = db.query(Extension).filter(Extension.id == req.extension_id, Extension.user_id == current_user.id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
        
    if not ext.is_active:
        raise HTTPException(status_code=400, detail="Extension is inactive")
        
    result = run_extension_sandbox(ext.code, req.context_data)
    return {"result": result}

@router.delete("/{ext_id}")
def delete_extension(ext_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ext = db.query(Extension).filter(Extension.id == ext_id, Extension.user_id == current_user.id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    db.delete(ext)
    db.commit()
    return {"message": "Extension deleted"}
