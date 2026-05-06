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
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    password TEXT,
    role TEXT,
    active INTEGER
)
""")

# REQUESTS
cursor.execute("""
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    role TEXT,
    type TEXT,
    status TEXT,
    username TEXT,
    employee_id TEXT UNIQUE,
    department TEXT,
    manager TEXT,
    requested_by TEXT
)
""")

# SESSIONS
cursor.execute("""
CREATE TABLE IF NOT EXISTS sessions (
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
INSERT OR IGNORE INTO users (email, password, role, active)
VALUES ('admin@test.com', 'admin123', 'admin', 1)
""")

conn.commit()
conn.close()

print("✅ Database Created Successfully")