import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_NAME = os.path.join(BASE_DIR, "database.db")

print("🔥 AUTH FILE LOADED")
import uuid
from datetime import datetime
import sqlite3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict

DB_NAME = "database.db"

router = APIRouter()

# ---------------- USERS DATABASE ----------------
# Temporary in-memory database

users_db: Dict[str, dict] = {

    "admin@test.com": {
        "email": "admin@test.com",
        "password": "Admin@123",
        "role": "admin",
        "force_change": False,
        "active": True
    },

    "user@test.com": {
        "email": "user@test.com",
        "password": "User@123",
        "role": "user",
        "force_change": False,
        "active": True
    }

}


# ---------------- REQUEST MODELS ----------------

class LoginRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    email: str
    new_password: str


# ---------------- ADMIN LOGIN ----------------

@router.post("/login")
def login(data: dict):

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("SELECT * FROM users WHERE email=?", (data["email"],))
    user = c.fetchone()

    if not user:
        return {"error": "User not found"}

    if data["password"] != user["password"]:
        return {"error": "Invalid password"}

    if user["active"] == 0:
        return {"error": "User is disabled"}

    # ✅ CREATE SESSION (THIS WAS MISSING)
    token = str(uuid.uuid4())

    c.execute("""
        INSERT INTO sessions (user_email, login_time, status, token)
        VALUES (?, ?, 'active', ?)
    """, (user["email"], datetime.now(), token))

    conn.commit()
    conn.close()

    return {
        "email": user["email"],
        "role": user["role"],
        "token": token,   # ✅ IMPORTANT
        "must_change_password": user["must_change_password"]
    }

# ---------------- USER LOGIN ----------------

@router.post("/user-login")
def user_login(data: LoginRequest):

    print("🔥 User FUNCTION CALLED:", data.email)  # 👈 ADD HERE

    user = users_db.get(data.email)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user["password"] != data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="User is offboarded")

    if user.get("force_change"):
        return {
            "email": user["email"],
            "role": user["role"],
            "force_change": True
        }

    # ✅ CREATE TOKEN
    token = str(uuid.uuid4())

    # ✅ INSERT SESSION
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # ✅ CREATE TABLE IF NOT EXISTS
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

    # ✅ INSERT SESSION
    cursor.execute("""
    INSERT INTO sessions (user_email, login_time, token, status)
    VALUES (?, ?, ?, ?)
    """, (user["email"], datetime.now(), token, "active"))

    conn.commit()
    conn.close()

    conn.commit()
    conn.close()

    print("✅ SESSION INSERTED:", user["email"])

    return {
        "email": user["email"],
        "role": user["role"],
        "token": token,
        "force_change": False
    }

# ---------------- CHANGE PASSWORD ----------------

@router.post("/change-password")
def change_password(data: ChangePasswordRequest):

    user = users_db.get(data.email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["password"] = data.new_password
    user["force_change"] = False

    return {
        "message": "Password updated successfully"
    }


# ---------------- GET USERS ----------------

@router.get("/users")
def get_users():
    return list(users_db.values())


# ---------------- OFFBOARD USER ----------------

@router.put("/offboard/{email}")
def offboard_user(email: str):

    user = users_db.get(email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["active"] = False

    return {
        "message": "User offboarded successfully"
    }
class LogoutRequest(BaseModel):
    token: str


@router.post("/logout")
def logout(data: LogoutRequest):

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE sessions
    SET logout_time= datetime('now'), 
    status='inactive'
    WHERE token=?
    """, (datetime.now(), data.token))

    conn.commit()
    conn.close()

    return {"message": "Logged out successfully"}


@router.get("/sessions")
def get_sessions():

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
    SELECT user_email, login_time, logout_time, status
    FROM sessions
    ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "email": r[0],
            "login_time": r[1],
            "logout_time": r[2],
            "status": r[3]
        }
        for r in rows
    ]