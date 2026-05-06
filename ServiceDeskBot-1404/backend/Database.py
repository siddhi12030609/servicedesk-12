import os
import sqlite3

# ✅ DEFINE DB PATH FIRST
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "database.db")

# ✅ CONNECT
conn = sqlite3.connect(DB_NAME)
cursor = conn.cursor()

# ================= USERS =================
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    password TEXT,
    role TEXT,
    active INTEGER
)
""")

# ================= REQUESTS =================
cursor.execute("""
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    role TEXT,
    type TEXT,
    status TEXT
)
""")

# ================= SESSIONS =================
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

# ================= CLEAN DATA =================
cursor.execute("DELETE FROM users")
cursor.execute("DELETE FROM requests")
cursor.execute("DELETE FROM sessions")

# ================= INSERT USERS =================
cursor.execute("""
INSERT INTO users (email, password, role, active) VALUES
('admin@test.com','Admin@123','admin',1),
('user@test.com','User@123','user',1)
""")

# ================= INSERT REQUESTS =================
cursor.execute("""
INSERT INTO requests (user_email, role, type, status) VALUES
('user@test.com','developer','Onboarding','Pending'),
('user@test.com','manager','Offboarding','Approved')
""")

conn.commit()
conn.close()

print("✅ DB FULLY INITIALIZED WITH CLEAN DATA")