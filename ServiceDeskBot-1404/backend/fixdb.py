import sqlite3
import os

DB = "database.db"

conn = sqlite3.connect(DB)
cur = conn.cursor()

# Assign employee IDs to existing users
cur.execute("SELECT email FROM users")
users = cur.fetchall()

counter = 1000

for u in users:
    emp_id = f"EMP{counter}"
    cur.execute(
        "UPDATE users SET employee_id=? WHERE email=?",
        (emp_id, u[0])
    )
    counter += 1

conn.commit()
conn.close()

print("✅ Employee IDs assigned to existing users")