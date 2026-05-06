import sqlite3
conn = sqlite3.connect("database.db"")
c = conn.cursor()

try:
    c.execute("ALTER TABLE requests ADD COLUMN manager_status TEXT DEFAULT 'Pending'")
    conn.commit()
except:
    pass  # already exists

conn.close()