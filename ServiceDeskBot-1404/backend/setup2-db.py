import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE users ADD COLUMN employee_id TEXT")
    print("✅ employee_id column added")
except Exception as e:
    print("⚠️ Already exists OR error:", e)

conn.commit()
conn.close()