ROLE_APPROVALS = {
    "requester": ["manager"],
    "manager": ["admin"],
    "admin": []
}

def get_approvers(role):
    return ROLE_APPROVALS.get(role, [])

def can_approve(user_role, target_role):
    approvers = get_approvers(target_role)
    return user_role in approvers