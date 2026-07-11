from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.models import Chapter
import json
import urllib.request

engine = create_engine("sqlite:///backend/writer_studio.db")
Session = sessionmaker(bind=engine)
db = Session()
chapter = db.query(Chapter).filter(Chapter.id == 1).first()
print(f"BEFORE: {chapter.title}, {chapter.type}")

chapter.type = "Explanation"
db.commit()

chapter2 = db.query(Chapter).filter(Chapter.id == 1).first()
print(f"AFTER: {chapter2.title}, {chapter2.type}")

