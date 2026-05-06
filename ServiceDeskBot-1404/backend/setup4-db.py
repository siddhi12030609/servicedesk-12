import sqlite3

conn = sqlite3.connect("database.db")
cur = conn.cursor()

# create groups table
cur.execute("""
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE
)
""")

# create user_groups table
cur.execute("""
CREATE TABLE IF NOT EXISTS user_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  group_name TEXT
)
""")

conn.commit()
conn.close()

print("Tables created successfully ✅")