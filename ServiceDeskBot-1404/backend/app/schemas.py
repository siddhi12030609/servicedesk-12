from pydantic import BaseModel

class RequestModel(BaseModel):
    user_email: str
    role: str
    type: str