import sqlite3

conn = sqlite3.connect("database.db")
c = conn.cursor()

columns = [
    ("username", "TEXT"),
    ("employee_id", "TEXT"),
    ("department", "TEXT"),
    ("manager", "TEXT")
]

for col, col_type in columns:
    try:
        c.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
        print(f"✅ Added column: {col}")
    except:
        print(f"⚠️ Column already exists: {col}")

conn.commit()
conn.close()