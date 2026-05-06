import sqlite3
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
DB_PATH = "database.db"

# 🧠 conversation memory
sessions = {}

class ChatRequest(BaseModel):
    message: str
    user_email: str


@router.post("/chat")
def chat(req: ChatRequest):

    msg = req.message.lower().strip()

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 🔹 get role
    c.execute("SELECT role FROM users WHERE email=?", (req.user_email,))
    user = c.fetchone()

    if not user:
        return {"reply": "User not found"}

    role = user[0]

    # =========================
    # 🧠 SESSION STATE
    # =========================
    state = sessions.get(req.user_email, {})

    # =========================
    # 🔥 STEP FLOW HANDLER
    # =========================

    # ---------- CREATE USER FLOW ----------
    if state.get("action") == "create_user":

        step = state.get("step")

        if step == "username":
            state["username"] = msg
            state["step"] = "department"
            return {"reply": "Enter department (IT / HR / FINANCE)"}

        elif step == "department":
            state["department"] = msg.upper()
            state["step"] = "role"
            return {"reply": "Enter role (developer / manager / admin)"}

        elif step == "role":
            state["role"] = msg
            state["step"] = "manager"
            return {"reply": "Enter manager name"}

        elif step == "manager":

            username = state["username"]
            dept = state["department"]
            role_name = state["role"]
            manager = msg
            email = f"{username}@test.com"

            # 🔥 generate emp id
            c.execute("SELECT COUNT(*) FROM users")
            count = c.fetchone()[0]
            emp_id = f"EMP{1000 + count}"

            # insert request
            c.execute("""
            INSERT INTO requests
            (username, user_email, employee_id, department, role, manager, type, status, manager_status, requested_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending', ?)
            """, (
                username,
                email,
                emp_id,
                dept,
                role_name,
                manager,
                "Onboarding",
                req.user_email
            ))

            conn.commit()

            sessions.pop(req.user_email, None)

            return {
                "reply": f"✅ User request created for {username}",
                "action": "fill_form",
                "data": {
                    "username": username,
                    "email": email,
                    "empId": emp_id,
                    "department": dept,
                    "role": role_name,
                    "manager": manager,
                    "type": "Onboarding"
                }
            }

    # ---------- DELETE USER FLOW ----------
    if state.get("action") == "delete_user":

        email = msg

        c.execute("DELETE FROM users WHERE email=?", (email,))
        conn.commit()

        sessions.pop(req.user_email, None)

        return {"reply": f"🗑️ Deleted {email}"}

    # ---------- APPROVE FLOW ----------
    if state.get("action") == "approve_request":

        try:
            req_id = int(msg)

            if role == "manager":
                c.execute("UPDATE requests SET manager_status='Approved' WHERE id=?", (req_id,))
                conn.commit()
                sessions.pop(req.user_email, None)
                return {"reply": f"✅ Manager approved request {req_id}"}

            elif role == "admin":
                c.execute("UPDATE requests SET status='Approved' WHERE id=?", (req_id,))
                conn.commit()
                sessions.pop(req.user_email, None)
                return {"reply": f"✅ Admin approved request {req_id}"}

        except:
            return {"reply": "Enter valid request ID"}

    # =========================
    # 🔹 START COMMANDS
    # =========================

    # CREATE USER
    if "create user" in msg or "create request" in msg:
        sessions[req.user_email] = {
            "action": "create_user",
            "step": "username"
        }
        return {"reply": "Enter username"}

    # DELETE USER
    if "delete user" in msg:
        sessions[req.user_email] = {
            "action": "delete_user"
        }
        return {"reply": "Enter user email to delete"}

    # APPROVE REQUEST
    if "approve request" in msg:
        sessions[req.user_email] = {
            "action": "approve_request"
        }
        return {"reply": "Enter request ID"}

    # VIEW PENDING
    if "pending" in msg:
        c.execute("SELECT id FROM requests WHERE status='Pending'")
        rows = c.fetchall()

        reply = "📌 Pending Requests:\n"
        for r in rows:
            reply += f"\n• ID {r[0]}"

        return {"reply": reply}

    return {"reply": "🤖 I can help with:\n• create user\n• delete user\n• approve request\n• view pending"}