import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "database.db")
from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

    @router.put("/offboard/{email}")
    def offboard_user(email: str):

    user = users_db.get(email)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["active"] = False

    return {"message": "User offboarded"}