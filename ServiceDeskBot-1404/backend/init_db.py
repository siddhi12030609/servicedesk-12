import sqlite3

conn = sqlite3.connect("database.db")
cursor = conn.cursor()


# CREATE USERS TABLE
cursor.execute("""
CREATE TABLE users (
    email TEXT PRIMARY KEY,
    password TEXT,
    role TEXT,
    active INTEGER
)
""")

# CREATE REQUESTS TABLE
cursor.execute("""
CREATE TABLE requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    role TEXT,
    type TEXT,
    status TEXT
)
""")

# INSERT USERS
cursor.execute("INSERT INTO users VALUES ('admin@test.com','Admin@123','admin',1)")
cursor.execute("INSERT INTO users VALUES ('user@test.com','User@123','user',1)")

# INSERT REQUESTS
cursor.execute("""
INSERT INTO requests (user_email,role,type,status)
VALUES ('user@test.com','developer','Onboarding','Pending')
""")

cursor.execute("""
INSERT INTO requests (user_email,role,type,status)
VALUES ('admin@test.com','manager','Offboarding','Approved')
""")

conn.commit()
conn.close()

print("✅ DB CREATED SUCCESSFULLY")