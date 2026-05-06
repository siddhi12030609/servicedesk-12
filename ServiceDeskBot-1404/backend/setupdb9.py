import sqlite3

conn = sqlite3.connect("database.db")
c = conn.cursor()

try:
    c.execute("ALTER TABLE users ADD COLUMN username TEXT")
    print("✅ username column added")
except:
    print("⚠️ already exists")

conn.commit()
conn.close()