from __future__ import annotations

from functools import wraps

from flask import redirect, render_template, session


def require_auth(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return redirect("/login")
        return view(*args, **kwargs)

    return wrapped


def require_admin(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if session.get("user_role") != "admin":
            return render_template(
                "error.ejs",
                title="Access Denied",
                message="You do not have permission to access this page.",
                code=403,
            ), 403
        return view(*args, **kwargs)

    return wrapped
