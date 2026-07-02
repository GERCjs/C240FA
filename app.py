from __future__ import annotations

import os

from flask import Flask, g, render_template, session

from web.routes import register_routes

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional convenience dependency
    load_dotenv = None

if load_dotenv:
    load_dotenv()


def create_app() -> Flask:
    app = Flask(
        __name__,
        static_folder="public",
        static_url_path="",
        template_folder="views",
    )
    app.secret_key = os.environ.get("SESSION_SECRET", "c240_ai_secret")
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

    register_template_helpers(app)
    register_routes(app)

    @app.context_processor
    def inject_user():
        user = None
        if session.get("user_id"):
            user = {
                "id": session.get("user_id"),
                "name": session.get("user_name"),
                "role": session.get("user_role"),
            }
        return {"user": user}

    @app.before_request
    def load_current_user():
        g.user = {
            "id": session.get("user_id"),
            "name": session.get("user_name"),
            "role": session.get("user_role"),
        } if session.get("user_id") else None

    @app.errorhandler(404)
    def not_found(_error):
        return render_template(
            "error.ejs",
            title="Page Not Found",
            message="The page you are looking for does not exist.",
            code=404,
        ), 404

    @app.errorhandler(500)
    def server_error(error):
        app.logger.exception(error)
        return render_template(
            "error.ejs",
            title="Server Error",
            message="Something went wrong. Please try again later.",
            code=500,
        ), 500

    return app


def register_template_helpers(app: Flask) -> None:
    @app.template_filter("date")
    def date_filter(value):
        if not value:
            return ""
        if hasattr(value, "strftime"):
            return value.strftime("%m/%d/%Y")
        return str(value).split("T")[0].split(" ")[0]

    @app.template_filter("datetime")
    def datetime_filter(value):
        if not value:
            return ""
        if hasattr(value, "strftime"):
            return value.strftime("%m/%d/%Y, %I:%M %p")
        return str(value)

    @app.template_filter("kb")
    def kb_filter(value):
        try:
            return f"{float(value) / 1024:.1f}"
        except (TypeError, ValueError):
            return "0.0"

    @app.template_global()
    def priority_badge(priority: str) -> str:
        return {"high": "danger", "medium": "warning", "low": "secondary"}.get(
            priority,
            "secondary",
        )

    @app.template_global()
    def status_badge(status: str) -> str:
        return "primary" if status == "in_progress" else "secondary"

    @app.template_global()
    def score_badge(score) -> str:
        try:
            numeric_score = float(score)
        except (TypeError, ValueError):
            numeric_score = 0
        if numeric_score >= 70:
            return "success"
        if numeric_score >= 50:
            return "warning"
        return "danger"

    @app.template_global()
    def choice_letter(index: int) -> str:
        return chr(65 + int(index))


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3000"))
    app.run(host="0.0.0.0", port=port, debug=True)
