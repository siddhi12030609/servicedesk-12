import sqlite3

conn = sqlite3.connect("database.db")
cursor = conn.cursor()

# Add new columns safely
try:
    cursor.execute("ALTER TABLE requests ADD COLUMN username TEXT")
except:
    pass

try:
    cursor.execute("ALTER TABLE requests ADD COLUMN employee_id TEXT")
except:
    pass

try:
    cursor.execute("ALTER TABLE requests ADD COLUMN department TEXT")
except:
    pass

try:
    cursor.execute("ALTER TABLE requests ADD COLUMN manager TEXT")
except:
    pass

try:
    cursor.execute("ALTER TABLE requests ADD COLUMN created_at TEXT")
except:
    pass

conn.commit()
conn.close()

print("✅ DB Updated")