import sqlite3

conn = sqlite3.connect("database.db")
cur = conn.cursor()

# Create groups table
cur.execute("""
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE
)
""")

# Create user_groups table
cur.execute("""
CREATE TABLE IF NOT EXISTS user_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  group_name TEXT
)
""")

conn.commit()
conn.close()

print("✅ Tables created successfully")