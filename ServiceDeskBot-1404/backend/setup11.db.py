import sqlite3
import os

# adjust path if needed
DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("Fixing session statuses...")

# ✅ Fix active sessions
cursor.execute("""
UPDATE sessions 
SET status = 'active' 
WHERE logout_time IS NULL
""")

# ✅ Fix inactive sessions
cursor.execute("""
UPDATE sessions 
SET status = 'inactive' 
WHERE logout_time IS NOT NULL
""")

conn.commit()
conn.close()

print("✅ Session data fixed successfully!")