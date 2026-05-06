import sqlite3

conn = sqlite3.connect("database.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    role TEXT,
    type TEXT,
    status TEXT,
    requested_by TEXT,
    username TEXT,
    employee_id TEXT,
    department TEXT,
    manager TEXT
)
""")

# USERS
cursor.execute("""
CREATE TABLE users (
    email TEXT PRIMARY KEY,
    password TEXT,
    role TEXT,
    active INTEGER
)
""")

# REQUESTS (IMPORTANT: includes requested_by)
cursor.execute("""
CREATE TABLE requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    role TEXT,
    type TEXT,
    status TEXT,
    requested_by TEXT
)
""")

# SESSIONS
cursor.execute("""
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    login_time TEXT,
    logout_time TEXT,
    token TEXT,
    status TEXT
)
""")

# DEFAULT ADMIN
cursor.execute("""
INSERT INTO users (email, password, role, active)
VALUES ('admin@test.com', 'admin123', 'admin', 1)
""")

conn.commit()
conn.close()

print("✅ Database created successfully")