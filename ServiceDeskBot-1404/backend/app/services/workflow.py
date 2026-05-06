from app.models.database import SessionLocal
from app.models.tables import ServiceRequest


def process_request(request_data, user_role):

    request_type = request_data.get("type")
    target_role = request_data.get("role")
    user_email = request_data.get("user_email")

    db = SessionLocal()

    try:
        status = "Pending"

        # Admin auto-process
        if user_role == "admin":
            if request_type == "onboarding":
                status = "Provisioned"
            elif request_type == "offboarding":
                status = "Deactivated"

        new_request = ServiceRequest(
            user_email=user_email,
            role=target_role,
            type=request_type,
            status=status
        )

        db.add(new_request)
        db.commit()

        return {
            "status": status,
            "processed_by": user_role
        }

    finally:
        db.close()