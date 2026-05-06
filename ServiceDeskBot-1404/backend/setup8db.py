import sqlite3

conn = sqlite3.connect("database.db")  # ✅ same DB_PATH
cursor = conn.cursor()

cursor.execute("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0")

conn.commit()
conn.close()

print("✅ Column added successfully")