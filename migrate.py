import sqlite3

db_path = "/home/shibin-jacob/Works/Writer Studio/writer_studio.db"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Add new columns to characters table if they don't exist
columns_to_add = [
    ("aliases", "VARCHAR"),
    ("role", "VARCHAR"),
    ("physical_description", "TEXT"),
    ("personality", "TEXT"),
    ("backstory", "TEXT"),
    ("goals_and_motivations", "TEXT"),
    ("conflicts", "TEXT")
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE characters ADD COLUMN {col_name} {col_type}")
        print(f"Added column {col_name}")
    except sqlite3.OperationalError as e:
        print(f"Column {col_name} might already exist: {e}")

conn.commit()
conn.close()

# Also create the scenes table using SQLAlchemy
from backend.database import engine, Base
from backend.models.models import *

Base.metadata.create_all(bind=engine)
print("Tables updated/created successfully.")
