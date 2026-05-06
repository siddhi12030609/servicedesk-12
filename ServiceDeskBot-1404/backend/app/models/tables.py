from sqlalchemy import Column, Integer, String, Boolean
from app.models.database import Base


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    role = Column(String)
    type = Column(String)  # onboarding / offboarding
    status = Column(String)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    role = Column(String)
    password = Column(String)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=True)