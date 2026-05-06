import os
import sqlite3
import uuid
import random
import string
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "database.db")

router = APIRouter()
from pydantic import BaseModel

class RequestCreate(BaseModel):
    username: str
    user_email: str
    employee_id: str
    department: str
    role: str
    manager: str
    type: str
    requested_by: str

# ---------------- MODELS ----------------
class LoginRequest(BaseModel):
    email: str
    password: str

class LogoutRequest(BaseModel):
    token: str

# ---------------- LOGIN ----------------

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

# ---------------- CREATE REQUEST ----------------
@router.post("/requests")
def create_request(data: RequestCreate):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

# ---------------- ONBOARDING ----------------
    if data.type and data.type.strip().lower() == "onboarding":
        
        # ✅ generate employee id starting from EMP1000
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]

        emp_number = 1000 + count
        data.employee_id = f"EMP{emp_number}"

        # prevent duplicate email
        cursor.execute("SELECT * FROM users WHERE email=?", (data.user_email,))
        if cursor.fetchone():
            conn.close()
            return {"error": "User already exists"}

# ---------------- OFFBOARDING ----------------
    elif data.type and data.type.strip().lower() == "offboarding":

        if not data.employee_id:
            conn.close()
            return {"error": "Employee ID required"}

        cursor.execute(
            "SELECT email FROM users WHERE employee_id=?",
            (data.employee_id,)
        )

        user = cursor.fetchone()

        if not user:
            conn.close()
            return {"error": "Employee not found"}

        # ✅ auto-fill email
        data.user_email = user[0]

    # ---------------- INSERT REQUEST ----------------
    cursor.execute("""
        INSERT INTO requests
        (username, user_email, employee_id, department, role, manager, type, status, manager_status, requested_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending', ?)
    """, (
        data.username,
        data.user_email,
        data.employee_id,
        data.department,
        data.role,
        data.manager,
        data.type,
        data.requested_by
    ))

    conn.commit()
    conn.close()

    return {
        "message": "Request created",
        "employee_id": data.employee_id
    }

# ---------------- GET REQUESTS ----------------
@router.get("/requests")
def get_requests():

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, user_email, role, type, status, requested_by,
               username, employee_id, department, manager, manager_status
        FROM requests
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r[0],
            "user_email": r[1],
            "role": r[2],
            "type": r[3],
            "status": r[4],
            "requested_by": r[5],
            "username": r[6],
            "employee_id": r[7],
            "department": r[8],
            "manager": r[9],
            "manager_status": r[10]
        }
        for r in rows
    ]

# ---------------- DELETE REQUEST ----------------

@router.delete("/requests/{id}")
def delete_request(id: int):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM requests WHERE id=?", (id,))

    conn.commit()
    conn.close()

    return {"message": "Deleted"}

# ADD THIS BELOW DELETE REQUEST
@router.put("/requests/{id}")
def update_request(id: int, data: dict):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT user_email, role, type, employee_id
        FROM requests
        WHERE id=?
    """, (id,))

    req = cursor.fetchone()

    if not req:
        conn.close()
        return {"error": "Request not found"}

    user_email, role, req_type, employee_id = req

    temp_password = None  # ✅ FIX

    # ---------------- ONBOARDING ----------------
    if req_type == "Onboarding":

        cursor.execute("SELECT * FROM users WHERE email=?", (user_email,))
        existing = cursor.fetchone()

        if not existing:
            import random, string
            temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))

            cursor.execute("""
                INSERT INTO users (email, password, role, active, employee_id)
                VALUES (?, ?, ?, 1, ?)
            """, (user_email, temp_password, role, employee_id))

            message = "User created"
        else:
            message = "User already exists"

    # ---------------- OFFBOARDING ----------------
    elif req_type == "Offboarding":

        cursor.execute("SELECT * FROM users WHERE employee_id=?", (employee_id,))
        existing = cursor.fetchone()

        if not existing:
            conn.close()
            return {"error": "Employee not found"}

        cursor.execute("""
            UPDATE users SET active=0 WHERE employee_id=?
        """, (employee_id,))

        message = "User deactivated"

    # ---------------- STATUS UPDATE ----------------
    cursor.execute("""
        UPDATE requests SET status=? WHERE id=?
    """, (data.get("status", "Approved"), id))

    conn.commit()
    conn.close()

    return {
        "message": message,
        "temporary_password": temp_password
    }
# ---------------- USERS ----------------
@router.get("/users")
def get_users():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        SELECT email, role, active, employee_id, department, manager
        FROM users
    """)

    rows = cur.fetchall()
    conn.close()

    users = []
    for r in rows:
        users.append({
            "email": r[0],
            "role": r[1],
            "active": bool(r[2]),
            "employee_id": r[3],
            "department": r[4] if r[4] else "-",
            "manager": r[5] if r[5] else "-"
        })

    return users

# ---------------- SESSIONS ----------------
@router.get("/sessions")
def get_sessions():

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT user_email, login_time, logout_time, status, token
        FROM sessions
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    sessions = []

    for r in rows:
        login_dt = datetime.fromisoformat(r[1])
        logout_dt = datetime.now() if not r[2] else datetime.fromisoformat(r[2])

        sessions.append({
            "email": r[0],
            "login_time": r[1],
            "logout_time": r[2],
            "status": r[3] if r[3] else ("active" if not r[2] else "inactive"),
             "token": r[4],
            "duration": str(logout_dt - login_dt)
        })

    return sessions

@router.put("/change-password")
def change_password(data: dict):

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        UPDATE users 
        SET password=?, must_change_password=0 
        WHERE email=?
    """, (data["new_password"], data["email"]))

    conn.commit()
    conn.close()

    return {"msg": "Password updated"}

# ---------------- LOGOUT ----------------
@router.post("/logout")
def logout(data: LogoutRequest):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE sessions
        SET logout_time=?, status='inactive'
        WHERE token=? AND status='active'
    """, (datetime.now(), data.token))

    conn.commit()
    conn.close()

    return {"message": "Logged out"}

@router.delete("/users/{email}")
def delete_user(email: str):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM users WHERE email=?", (email,))
    conn.commit()

    # ✅ ALSO DELETE RELATED REQUESTS
    cursor.execute("DELETE FROM requests WHERE user_email=?", (email,))
    conn.commit()

    conn.close()

    return {"message": "User deleted successfully"}

@router.put("/users/{email}/enable")
def enable_user(email: str):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("UPDATE users SET active=1 WHERE email=?", (email,))
    conn.commit()
    conn.close()

    return {"message": "User enabled"}

@router.put("/users/{email}/disable")
def disable_user(email: str):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("UPDATE users SET active=0 WHERE email=?", (email,))
    conn.commit()
    conn.close()

    return {"message": "User disabled"}

@router.put("/sessions/{token}/force-logout")
def force_logout(token: str):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE sessions
        SET logout_time=?, status='inactive'
        WHERE token=? AND status='active'
    """, (datetime.now(), token))

    conn.commit()
    conn.close()

    return {"message": "Session force logged out"}

@router.get("/sessions/check/{token}")
def check_session(token: str):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT status FROM sessions
        WHERE token=?
    """, (token,))

    session = cursor.fetchone()
    conn.close()

    if not session:
        return {"valid": False}

    return {"valid": session[0] == "active"}

@router.put("/users/update")
def update_user(data: dict):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ✅ Update users table
    cursor.execute("""
        UPDATE users
        SET role=?, employee_id=?
        WHERE email=?
    """, (data["role"], data["employee_id"], data["email"]))

    # ✅ ALSO update latest request (for department & manager)
    cursor.execute("""
        UPDATE requests
        SET department=?, manager=?
        WHERE user_email=? AND id = (
            SELECT MAX(id) FROM requests WHERE user_email=?
        )
    """, (data["department"], data["manager"], data["email"], data["email"]))

    conn.commit()
    conn.close()

    return {"message": "User updated successfully"}

# ---------------- GROUPS ----------------

@router.post("/groups")
def create_group(data: dict):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("INSERT INTO groups (name) VALUES (?)", (data["name"],))
    conn.commit()
    conn.close()

    return {"message": "Group created"}


@router.get("/groups")
def get_groups():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("SELECT name FROM groups")
    rows = cur.fetchall()
    conn.close()

    return [r[0] for r in rows]


@router.delete("/groups/{name}")
def delete_group(name: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("DELETE FROM groups WHERE name=?", (name,))
    cur.execute("DELETE FROM user_groups WHERE group_name=?", (name,))

    conn.commit()
    conn.close()

    return {"message": "Group deleted"}


@router.post("/groups/assign")
def assign_user_group(data: dict):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO user_groups (user_email, group_name)
        VALUES (?, ?)
    """, (data["email"], data["group"]))

    conn.commit()
    conn.close()

    return {"message": "User added to group"}


@router.post("/groups/add-user")
def add_user(data: dict):
    conn = sqlite3.connect("database.db")
    cur = conn.cursor()

    cur.execute("INSERT INTO user_groups (user_email, group_name) VALUES (?, ?)",
                (data["email"], data["group"]))

    conn.commit()
    conn.close()
    return {"msg": "added"}

@router.post("/groups/remove-user")
def remove_user(data: dict):
    conn = sqlite3.connect("database.db")
    cur = conn.cursor()

    cur.execute("DELETE FROM user_groups WHERE user_email=? AND group_name=?",
                (data["email"], data["group"]))

    conn.commit()
    conn.close()
    return {"msg": "removed"}

@router.get("/groups/{group}")
def get_group_users(group: str):
    conn = sqlite3.connect("database.db")
    cur = conn.cursor()

    cur.execute("SELECT user_email FROM user_groups WHERE group_name=?", (group,))
    data = cur.fetchall()

    conn.close()
    return [{"user_email": x[0]} for x in data]

@router.put("/requests/manager-approve/{id}")
def manager_approve(id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("UPDATE requests SET manager_status='Approved' WHERE id=?", (id,))
    conn.commit()
    conn.close()

    return {"msg": "Manager Approved"}

def generate_password():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))

@router.put("/requests/approve/{id}")
def approve(id: int):

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # check manager approval
    c.execute("SELECT manager_status FROM requests WHERE id=?", (id,))
    row = c.fetchone()

    if not row or row[0] != "Approved":
        return {"error": "Manager approval pending"}

    # get request data
    c.execute("""
        SELECT username, user_email, employee_id, department, role, manager
        FROM requests WHERE id=?
    """, (id,))
    
    user = c.fetchone()

    if not user:
        return {"error": "Request not found"}

    username, email, emp_id, dept, role, manager = user

    # ✅ prevent duplicate
    c.execute("SELECT * FROM users WHERE email=?", (email,))
    if c.fetchone():
        return {"error": "User already exists"}

    temp_password = generate_password()

    c.execute("""
        INSERT INTO users 
        (username, email, employee_id, department, role, manager, password, must_change_password, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
    """, (username, email, emp_id, dept, role, manager, temp_password))

    c.execute("UPDATE requests SET status='Approved' WHERE id=?", (id,))

    conn.commit()
    conn.close()

    return {
        "msg": "Approved",
        "temp_password": temp_password
    }


@router.post("/chatbot")
def chatbot(data: dict):

    message = data.get("message", "").lower()
    role = data.get("role")
    email = data.get("email")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # ================= ADMIN =================
    if role == "admin":

        if "approve request" in message:
            try:
                req_id = int(message.split()[-1])

                # ✅ call real approve logic
                result = approve(req_id)

                if "error" in result:
                    return {"reply": result["error"]}

                return {
                    "reply": f"User created ✅ Temp Password: {result['temp_password']}"
                }

            except:
                return {"reply": "Invalid request ID"}

    # ================= MANAGER =================
    if role == "manager":

        if "approve request" in message:
            try:
                req_id = int(message.split()[-1])
                c.execute("UPDATE requests SET manager_status='Approved' WHERE id=?", (req_id,))
                conn.commit()
                return {"reply": f"Manager approved request {req_id} ✅"}
            except:
                return {"reply": "Invalid request ID"}

    # ================= USER =================
    if role == "user":

        if "my requests" in message:
            c.execute("SELECT id, status FROM requests WHERE requested_by=?", (email,))
            rows = c.fetchall()

            if not rows:
                return {"reply": "No requests found"}

            result = "\n".join([f"ID: {r[0]} → {r[1]}" for r in rows])
            return {"reply": result}

    conn.close()

    return {"reply": "Sorry, I didn’t understand that 🤖"}