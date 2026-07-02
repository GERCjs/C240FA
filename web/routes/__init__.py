from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from flask import (
    Response,
    current_app,
    jsonify,
    redirect,
    render_template,
    request,
    session,
)

from web import db
from web.auth import require_admin, require_auth
from web.passwords import hash_password, verify_password
from web.services import rag_client
from web.services.fallbacks import (
    generate_basic_plan,
    generate_local_flashcards,
    generate_local_quiz,
    generate_local_summary,
)
from web.uploads import allowed_file, extract_text, save_upload
from web.validation import (
    is_non_empty,
    is_valid_date,
    is_valid_email,
    is_valid_priority,
    sanitize_input,
    sanitize_prompt,
)


def register_routes(app):
    app.add_url_rule("/", view_func=index)
    app.add_url_rule("/register", view_func=show_register, methods=["GET"])
    app.add_url_rule("/register", view_func=register, methods=["POST"])
    app.add_url_rule("/login", view_func=show_login, methods=["GET"])
    app.add_url_rule("/login", view_func=login, methods=["POST"])
    app.add_url_rule("/logout", view_func=logout)

    app.add_url_rule("/dashboard", view_func=require_auth(show_dashboard))

    app.add_url_rule("/chat", view_func=require_auth(show_chat), methods=["GET"])
    app.add_url_rule("/chat", view_func=require_auth(ask_question), methods=["POST"])
    app.add_url_rule("/chat/new", view_func=require_auth(new_chat_session), methods=["POST"])
    app.add_url_rule("/chat/history", view_func=require_auth(chat_history))
    app.add_url_rule("/chat/session/<int:session_id>", view_func=require_auth(show_chat_session))

    app.add_url_rule("/assignments", view_func=require_auth(show_assignments), methods=["GET"])
    app.add_url_rule("/assignments", view_func=require_auth(create_assignment), methods=["POST"])
    app.add_url_rule(
        "/assignments/<int:assignment_id>/update",
        view_func=require_auth(update_assignment),
        methods=["POST"],
    )
    app.add_url_rule(
        "/assignments/<int:assignment_id>/delete",
        view_func=require_auth(delete_assignment),
        methods=["POST"],
    )
    app.add_url_rule(
        "/assignments/<int:assignment_id>/plan",
        view_func=require_auth(generate_study_plan),
        methods=["POST"],
    )

    app.add_url_rule("/quizzes", view_func=require_auth(show_quizzes))
    app.add_url_rule("/quizzes/generate", view_func=require_auth(generate_quiz), methods=["POST"])
    app.add_url_rule("/quizzes/<int:quiz_id>", view_func=require_auth(show_quiz))
    app.add_url_rule(
        "/quizzes/<int:quiz_id>/submit",
        view_func=require_auth(submit_quiz),
        methods=["POST"],
    )
    app.add_url_rule("/quizzes/<int:quiz_id>/results", view_func=require_auth(show_quiz_results))

    app.add_url_rule("/documents", view_func=require_auth(show_documents))
    app.add_url_rule(
        "/documents/upload",
        view_func=require_auth(upload_document),
        methods=["POST"],
    )
    app.add_url_rule(
        "/documents/<int:document_id>/delete",
        view_func=require_auth(delete_document),
        methods=["POST"],
    )

    app.add_url_rule("/summaries", view_func=require_auth(show_summaries))
    app.add_url_rule(
        "/summaries/generate",
        view_func=require_auth(generate_summary),
        methods=["POST"],
    )
    app.add_url_rule("/summaries/<int:summary_id>", view_func=require_auth(show_summary))
    app.add_url_rule(
        "/summaries/<int:summary_id>/export",
        view_func=require_auth(export_summary),
    )

    app.add_url_rule("/flashcards", view_func=require_auth(show_flashcards))
    app.add_url_rule(
        "/flashcards/generate",
        view_func=require_auth(generate_flashcards),
        methods=["POST"],
    )
    app.add_url_rule(
        "/flashcards/<int:card_id>/review",
        view_func=require_auth(review_flashcard),
        methods=["POST"],
    )

    app.add_url_rule("/admin", view_func=require_auth(require_admin(admin_dashboard)))
    app.add_url_rule("/admin/users", view_func=require_auth(require_admin(admin_users)))
    app.add_url_rule(
        "/admin/users/<int:user_id>/delete",
        view_func=require_auth(require_admin(admin_delete_user)),
        methods=["POST"],
    )
    app.add_url_rule("/admin/documents", view_func=require_auth(require_admin(admin_documents)))
    app.add_url_rule(
        "/admin/documents/<int:document_id>/delete",
        view_func=require_auth(require_admin(admin_delete_document)),
        methods=["POST"],
    )
    app.add_url_rule("/admin/analytics", view_func=require_auth(require_admin(admin_analytics)))


def current_user_id() -> int:
    return int(session["user_id"])


def index():
    return render_template("index.ejs")


def show_register():
    return render_template("register.ejs", error=None)


def register():
    name = sanitize_input(request.form.get("name"))
    email = sanitize_input(request.form.get("email"))
    password = request.form.get("password", "")

    if not is_non_empty(name) or not is_valid_email(email) or not is_non_empty(password):
        return render_template("register.ejs", error="Please fill in all fields with valid data.")
    if len(password) < 6:
        return render_template("register.ejs", error="Password must be at least 6 characters.")

    if db.fetch_one("SELECT id FROM users WHERE email = %s", (email,)):
        return render_template("register.ejs", error="Email already exists.")

    try:
        hashed = hash_password(password)
        db.insert(
            """
            INSERT INTO users (name, email, password, role)
            VALUES (%s, %s, %s, 'student')
            """,
            (name, email, hashed),
        )
    except Exception:
        current_app.logger.exception("Registration failed")
        return render_template("register.ejs", error="Registration failed. Please try again.")

    return redirect("/login")


def show_login():
    return render_template("login.ejs", error=None)


def login():
    email = sanitize_input(request.form.get("email"))
    password = request.form.get("password", "")

    if not is_valid_email(email) or not is_non_empty(password):
        return render_template("login.ejs", error="Please enter a valid email and password.")

    user = db.fetch_one("SELECT * FROM users WHERE email = %s", (email,))
    if not user:
        return render_template("login.ejs", error="User not found.")

    try:
        password_matches = verify_password(password, user.get("password", ""))
    except Exception:
        current_app.logger.exception("Password verification failed")
        password_matches = False

    if not password_matches:
        return render_template("login.ejs", error="Incorrect password.")

    session["user_id"] = user["id"]
    session["user_name"] = user["name"]
    session["user_role"] = user.get("role") or "student"
    return redirect("/dashboard")


def logout():
    session.clear()
    return redirect("/")


def show_dashboard():
    user_id = current_user_id()
    deadlines = db.fetch_all(
        """
        SELECT title, module, deadline, priority, status
        FROM assignments
        WHERE user_id = %s AND status != 'completed' AND deadline >= NOW()
        ORDER BY deadline ASC
        LIMIT 5
        """,
        (user_id,),
    )
    recent_chats = db.fetch_all(
        """
        SELECT id, title, created_at
        FROM chat_sessions
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 5
        """,
        (user_id,),
    )
    quiz_performance = db.fetch_all(
        """
        SELECT qa.percentage, qa.score, qa.total, qa.completed_at, q.title as quiz_title
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.user_id = %s
        ORDER BY qa.completed_at DESC
        LIMIT 5
        """,
        (user_id,),
    )
    document_count = _count("SELECT COUNT(*) as count FROM documents WHERE user_id = %s", (user_id,))
    overdue_count = _count(
        """
        SELECT COUNT(*) as count
        FROM assignments
        WHERE user_id = %s AND status != 'completed' AND deadline < NOW()
        """,
        (user_id,),
    )
    progress = db.fetch_one(
        """
        SELECT
            (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = %s) as quizzes_taken,
            (SELECT COUNT(*) FROM flashcards WHERE user_id = %s AND times_reviewed > 0) as cards_reviewed,
            (SELECT COUNT(*) FROM study_summaries WHERE user_id = %s) as summaries_created,
            (SELECT COALESCE(AVG(percentage), 0) FROM quiz_attempts WHERE user_id = %s) as avg_quiz_score
        """,
        (user_id, user_id, user_id, user_id),
    ) or {
        "quizzes_taken": 0,
        "cards_reviewed": 0,
        "summaries_created": 0,
        "avg_quiz_score": 0,
    }

    return render_template(
        "dashboard.ejs",
        deadlines=deadlines,
        recentChats=recent_chats,
        quizPerformance=quiz_performance,
        documentCount=document_count,
        overdueCount=overdue_count,
        progress=progress,
    )


def show_chat():
    sessions = _chat_sessions(current_user_id())
    return render_template(
        "chat.ejs",
        sessions=sessions,
        currentSession=None,
        messages=[],
        question=None,
        answer=None,
        sources=[],
    )


def ask_question():
    user_id = current_user_id()
    question = sanitize_prompt(sanitize_input(request.form.get("question")))
    if not question:
        return redirect("/chat")

    session_id = request.form.get("session_id")
    if session_id:
        session_id = int(session_id)
    else:
        session_id = db.insert(
            "INSERT INTO chat_sessions (user_id, title) VALUES (%s, %s)",
            (user_id, question[:100]),
        )

    db.insert(
        "INSERT INTO chat_messages (session_id, sender, message) VALUES (%s, 'user', %s)",
        (session_id, question),
    )

    history = db.fetch_all(
        """
        SELECT sender, message
        FROM chat_messages
        WHERE session_id = %s
        ORDER BY created_at ASC
        LIMIT 10
        """,
        (session_id,),
    )
    context = "\n".join(f"{item['sender']}: {item['message']}" for item in history)

    try:
        response = rag_client.post_json("/chat", {"question": question, "context": context})
        answer = response.get("answer", "")
        sources = response.get("sources", [])
    except Exception:
        current_app.logger.exception("RAG chat call failed")
        answer = "Unable to connect to AI service. Please make sure the RAG server is running."
        sources = []

    db.insert(
        "INSERT INTO chat_messages (session_id, sender, message) VALUES (%s, 'ai', %s)",
        (session_id, answer),
    )
    messages = db.fetch_all(
        """
        SELECT sender, message, created_at
        FROM chat_messages
        WHERE session_id = %s
        ORDER BY created_at ASC
        """,
        (session_id,),
    )
    return render_template(
        "chat.ejs",
        sessions=_chat_sessions(user_id),
        currentSession=session_id,
        messages=messages,
        question=question,
        answer=answer,
        sources=sources,
    )


def new_chat_session():
    return redirect("/chat")


def chat_history():
    return jsonify({"sessions": _chat_sessions(current_user_id())})


def show_chat_session(session_id: int):
    user_id = current_user_id()
    exists = db.fetch_one(
        "SELECT id FROM chat_sessions WHERE id = %s AND user_id = %s",
        (session_id, user_id),
    )
    if not exists:
        return redirect("/chat")
    messages = db.fetch_all(
        """
        SELECT sender, message, created_at
        FROM chat_messages
        WHERE session_id = %s
        ORDER BY created_at ASC
        """,
        (session_id,),
    )
    return render_template(
        "chat.ejs",
        sessions=_chat_sessions(user_id),
        currentSession=session_id,
        messages=messages,
        question=None,
        answer=None,
        sources=[],
    )


def show_assignments():
    assignments = db.fetch_all(
        "SELECT * FROM assignments WHERE user_id = %s ORDER BY deadline ASC",
        (current_user_id(),),
    )
    now = datetime.now()
    upcoming = [
        item for item in assignments if item.get("deadline") and item["deadline"] > now and item["status"] != "completed"
    ]
    overdue = [
        item for item in assignments if item.get("deadline") and item["deadline"] <= now and item["status"] != "completed"
    ]
    completed = [item for item in assignments if item["status"] == "completed"]
    return render_template(
        "assignments.ejs",
        assignments=assignments,
        upcoming=upcoming,
        overdue=overdue,
        completed=completed,
        error=None,
        success=None,
    )


def create_assignment():
    title = sanitize_input(request.form.get("title"))
    module = sanitize_input(request.form.get("module"))
    description = sanitize_input(request.form.get("description"))
    deadline = request.form.get("deadline", "")
    priority = request.form.get("priority", "")
    if not is_non_empty(title) or not is_non_empty(module) or not is_valid_date(deadline) or not is_valid_priority(priority):
        return redirect("/assignments")
    db.insert(
        """
        INSERT INTO assignments (user_id, title, module, description, deadline, priority)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (current_user_id(), title, module, description, deadline, priority),
    )
    return redirect("/assignments")


def update_assignment(assignment_id: int):
    status = request.form.get("status")
    if status not in {"pending", "in_progress", "completed"}:
        return redirect("/assignments")
    db.execute(
        "UPDATE assignments SET status = %s WHERE id = %s AND user_id = %s",
        (status, assignment_id, current_user_id()),
    )
    return redirect("/assignments")


def delete_assignment(assignment_id: int):
    db.execute(
        "DELETE FROM assignments WHERE id = %s AND user_id = %s",
        (assignment_id, current_user_id()),
    )
    return redirect("/assignments")


def generate_study_plan(assignment_id: int):
    assignment = db.fetch_one(
        "SELECT * FROM assignments WHERE id = %s AND user_id = %s",
        (assignment_id, current_user_id()),
    )
    if not assignment:
        return redirect("/assignments")

    days_remaining = 7
    if assignment.get("deadline"):
        days_remaining = (assignment["deadline"] - datetime.now()).days + 1

    try:
        response = rag_client.post_json(
            "/generate-plan",
            {
                "title": assignment["title"],
                "module": assignment["module"],
                "description": assignment.get("description") or "",
                "days_remaining": days_remaining,
                "priority": assignment["priority"],
            },
        )
        plan = response.get("plan", "")
    except Exception:
        current_app.logger.exception("Study plan generation failed")
        plan = generate_basic_plan(assignment, days_remaining)

    db.execute(
        "UPDATE assignments SET study_plan = %s WHERE id = %s AND user_id = %s",
        (plan, assignment_id, current_user_id()),
    )
    return redirect("/assignments")


def show_quizzes():
    user_id = current_user_id()
    quizzes = db.fetch_all(
        "SELECT * FROM quizzes WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,),
    )
    attempts = db.fetch_all(
        """
        SELECT qa.*, q.title as quiz_title
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.user_id = %s
        ORDER BY qa.completed_at DESC
        LIMIT 10
        """,
        (user_id,),
    )
    return render_template("quizzes.ejs", quizzes=quizzes, attempts=attempts, error=None)


def generate_quiz():
    user_id = current_user_id()
    subject = sanitize_input(request.form.get("subject"))
    topic = sanitize_input(request.form.get("topic"))
    question_count = min(int(request.form.get("question_count") or 5), 10)
    quiz_type = request.form.get("quiz_type") or "mcq"
    if not subject or not topic:
        return redirect("/quizzes")

    try:
        response = rag_client.post_json(
            "/generate-quiz",
            {"subject": subject, "topic": topic, "count": question_count, "type": quiz_type},
        )
        questions = response.get("questions", [])
    except Exception:
        current_app.logger.exception("Quiz generation failed")
        questions = generate_local_quiz(subject, topic, question_count, quiz_type)

    title = f"{subject} - {topic} Quiz"
    quiz_id = db.insert(
        """
        INSERT INTO quizzes (user_id, title, subject, topic, question_count, quiz_type, questions)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (user_id, title, subject, topic, len(questions), quiz_type, json.dumps(questions)),
    )
    return redirect(f"/quizzes/{quiz_id}")


def show_quiz(quiz_id: int):
    quiz = _user_quiz(quiz_id)
    if not quiz:
        return redirect("/quizzes")
    quiz["questions"] = _loads_json(quiz.get("questions"), [])
    return render_template("quiz-take.ejs", quiz=quiz)


def submit_quiz(quiz_id: int):
    quiz = _user_quiz(quiz_id)
    if not quiz:
        return redirect("/quizzes")
    questions = _loads_json(quiz.get("questions"), [])
    graded = []
    score = 0

    for index, question in enumerate(questions):
        user_answer = request.form.get(f"answers[q{index}]", "")
        correct = _is_answer_correct(question, user_answer)
        if correct:
            score += 1
        graded.append(
            {
                "question": question.get("question", ""),
                "user_answer": user_answer,
                "correct_answer": question.get("correct_answer", ""),
                "explanation": question.get("explanation", ""),
                "is_correct": correct,
            }
        )

    total = len(questions)
    percentage = round((score / total) * 100) if total else 0
    db.insert(
        """
        INSERT INTO quiz_attempts (user_id, quiz_id, answers, score, total, percentage)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (current_user_id(), quiz_id, json.dumps(graded), score, total, percentage),
    )
    return render_template(
        "quiz-results.ejs",
        quiz=quiz,
        graded=graded,
        score=score,
        total=total,
        percentage=percentage,
    )


def show_quiz_results(quiz_id: int):
    attempts = db.fetch_all(
        """
        SELECT qa.*, q.title as quiz_title
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.quiz_id = %s AND qa.user_id = %s
        ORDER BY qa.completed_at DESC
        """,
        (quiz_id, current_user_id()),
    )
    if not attempts:
        return redirect("/quizzes")
    for attempt in attempts:
        attempt["answers"] = _loads_json(attempt.get("answers"), [])
    return render_template(
        "quiz-results-history.ejs",
        attempts=attempts,
        quizTitle=attempts[0]["quiz_title"],
    )


def show_documents():
    return _render_documents()


def upload_document():
    file = request.files.get("document")
    if not file or not file.filename or not allowed_file(file):
        return _render_documents(error="Please select a valid file (PDF, TXT, MD, or DOCX).")

    try:
        filename, file_path, file_size = save_upload(file)
        content = extract_text(file_path, file.filename)
        document_id = db.insert(
            """
            INSERT INTO documents (user_id, filename, original_name, file_type, file_size, content)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                current_user_id(),
                filename,
                file.filename,
                Path(file.filename).suffix.lower(),
                file_size,
                content,
            ),
        )
        try:
            rag_client.post_json(
                "/index-document",
                {"document_id": document_id, "content": content, "filename": file.filename},
                timeout=30,
            )
            db.execute("UPDATE documents SET indexed = 1 WHERE id = %s", (document_id,))
        except Exception:
            current_app.logger.exception("Document indexing skipped")
        return _render_documents(success=f'"{file.filename}" uploaded successfully.')
    except Exception:
        current_app.logger.exception("Document upload failed")
        return _render_documents(error="Failed to process the document.")


def delete_document(document_id: int):
    doc = db.fetch_one(
        "SELECT filename FROM documents WHERE id = %s AND user_id = %s",
        (document_id, current_user_id()),
    )
    if not doc:
        return redirect("/documents")
    db.execute(
        "DELETE FROM documents WHERE id = %s AND user_id = %s",
        (document_id, current_user_id()),
    )
    _delete_uploaded_file(doc.get("filename"))
    return redirect("/documents")


def show_summaries():
    user_id = current_user_id()
    summaries = db.fetch_all(
        """
        SELECT ss.*, d.original_name as document_name
        FROM study_summaries ss
        LEFT JOIN documents d ON ss.document_id = d.id
        WHERE ss.user_id = %s
        ORDER BY ss.created_at DESC
        """,
        (user_id,),
    )
    documents = db.fetch_all(
        "SELECT id, original_name FROM documents WHERE user_id = %s",
        (user_id,),
    )
    return render_template("summaries.ejs", summaries=summaries, documents=documents, error=None)


def generate_summary():
    document_id = int(request.form.get("document_id") or 0)
    if not document_id:
        return redirect("/summaries")
    doc = db.fetch_one(
        "SELECT * FROM documents WHERE id = %s AND user_id = %s",
        (document_id, current_user_id()),
    )
    if not doc or len(doc.get("content") or "") < 50:
        return redirect("/summaries")

    try:
        response = rag_client.post_json(
            "/generate-summary",
            {"content": doc["content"][:5000], "title": doc["original_name"]},
        )
        summary_text = response.get("summary", "")
        key_points = response.get("key_points", [])
    except Exception:
        current_app.logger.exception("Summary generation failed")
        fallback = generate_local_summary(doc.get("content") or "", doc["original_name"])
        summary_text = fallback["summary"]
        key_points = fallback["key_points"]

    db.insert(
        """
        INSERT INTO study_summaries (user_id, document_id, title, summary_text, key_points)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            current_user_id(),
            document_id,
            f"Summary: {doc['original_name']}",
            summary_text,
            json.dumps(key_points),
        ),
    )
    return redirect("/summaries")


def show_summary(summary_id: int):
    summary = db.fetch_one(
        """
        SELECT ss.*, d.original_name as document_name
        FROM study_summaries ss
        LEFT JOIN documents d ON ss.document_id = d.id
        WHERE ss.id = %s AND ss.user_id = %s
        """,
        (summary_id, current_user_id()),
    )
    if not summary:
        return redirect("/summaries")
    summary["key_points"] = _loads_json(summary.get("key_points"), [])
    return render_template("summary-detail.ejs", summary=summary)


def export_summary(summary_id: int):
    summary = db.fetch_one(
        "SELECT * FROM study_summaries WHERE id = %s AND user_id = %s",
        (summary_id, current_user_id()),
    )
    if not summary:
        return redirect("/summaries")
    key_points = _loads_json(summary.get("key_points"), [])
    content = f"# {summary['title']}\n\n"
    content += f"Generated: {summary.get('created_at')}\n\n"
    content += f"## Summary\n\n{summary['summary_text']}\n\n"
    if key_points:
        content += "## Key Points\n\n"
        content += "\n".join(f"{index + 1}. {point}" for index, point in enumerate(key_points))
    filename = "".join(ch if ch.isalnum() else "_" for ch in summary["title"]) + ".txt"
    return Response(
        content,
        headers={
            "Content-Type": "text/plain",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


def show_flashcards():
    user_id = current_user_id()
    flashcards = db.fetch_all(
        "SELECT * FROM flashcards WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,),
    )
    documents = db.fetch_all(
        "SELECT id, original_name FROM documents WHERE user_id = %s",
        (user_id,),
    )
    return render_template(
        "flashcards.ejs",
        flashcards=flashcards,
        documents=documents,
        error=None,
    )


def generate_flashcards():
    user_id = current_user_id()
    document_id = int(request.form.get("document_id") or 0)
    subject = sanitize_input(request.form.get("subject")) or "General"
    topic = sanitize_input(request.form.get("topic")) or "Study Notes"
    content = ""

    if document_id:
        doc = db.fetch_one(
            "SELECT content FROM documents WHERE id = %s AND user_id = %s",
            (document_id, user_id),
        )
        content = doc.get("content") if doc else ""

    try:
        response = rag_client.post_json(
            "/generate-flashcards",
            {"content": content[:3000], "subject": subject, "topic": topic, "count": 5},
        )
        cards = response.get("flashcards", [])
        normalized_cards = [
            {"subject": subject, "topic": topic, "front": card.get("front"), "back": card.get("back")}
            for card in cards
        ]
    except Exception:
        current_app.logger.exception("Flashcard generation failed")
        normalized_cards = generate_local_flashcards(subject, topic)

    for card in normalized_cards:
        db.insert(
            """
            INSERT INTO flashcards (user_id, document_id, subject, topic, front_text, back_text)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                document_id or None,
                card.get("subject") or subject,
                card.get("topic") or topic,
                card.get("front") or f"What is {topic}?",
                card.get("back") or f"{topic} is a concept in {subject}.",
            ),
        )
    return redirect("/flashcards")


def review_flashcard(card_id: int):
    db.execute(
        """
        UPDATE flashcards
        SET times_reviewed = times_reviewed + 1, last_reviewed = NOW()
        WHERE id = %s AND user_id = %s
        """,
        (card_id, current_user_id()),
    )
    return jsonify({"success": True})


def admin_dashboard():
    stats = db.fetch_one(
        """
        SELECT
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM chat_sessions) as total_sessions,
            (SELECT COUNT(*) FROM chat_messages) as total_messages,
            (SELECT COUNT(*) FROM documents) as total_documents,
            (SELECT COUNT(*) FROM quizzes) as total_quizzes,
            (SELECT COUNT(*) FROM quiz_attempts) as total_attempts,
            (SELECT COUNT(*) FROM assignments) as total_assignments
        """
    ) or {}
    return render_template("admin/dashboard.ejs", stats=stats)


def admin_users():
    users = db.fetch_all(
        """
        SELECT u.id, u.name, u.email, u.role, u.created_at,
            (SELECT COUNT(*) FROM chat_sessions WHERE user_id = u.id) as chat_count,
            (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = u.id) as quiz_count
        FROM users u
        ORDER BY u.created_at DESC
        """
    )
    return render_template("admin/users.ejs", users=users)


def admin_delete_user(user_id: int):
    if user_id != current_user_id():
        db.execute("DELETE FROM users WHERE id = %s", (user_id,))
    return redirect("/admin/users")


def admin_documents():
    documents = db.fetch_all(
        """
        SELECT d.*, u.name as uploader_name
        FROM documents d
        JOIN users u ON d.user_id = u.id
        ORDER BY d.created_at DESC
        """
    )
    return render_template("admin/documents.ejs", documents=documents)


def admin_delete_document(document_id: int):
    doc = db.fetch_one("SELECT filename FROM documents WHERE id = %s", (document_id,))
    if doc:
        _delete_uploaded_file(doc.get("filename"))
    db.execute("DELETE FROM documents WHERE id = %s", (document_id,))
    return redirect("/admin/documents")


def admin_analytics():
    chat_data = db.fetch_all(
        """
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM chat_messages
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
        """
    )
    quiz_stats = db.fetch_one(
        """
        SELECT
            COALESCE(AVG(percentage), 0) as avg_score,
            COUNT(*) as total_attempts,
            COALESCE(MAX(percentage), 0) as highest_score,
            COALESCE(MIN(percentage), 0) as lowest_score
        FROM quiz_attempts
        """
    ) or {}
    active_users = db.fetch_all(
        """
        SELECT u.name, COUNT(cm.id) as message_count
        FROM users u
        LEFT JOIN chat_sessions cs ON u.id = cs.user_id
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        GROUP BY u.id, u.name
        ORDER BY message_count DESC
        LIMIT 10
        """
    )
    return render_template(
        "admin/analytics.ejs",
        chatData=chat_data,
        quizStats=quiz_stats,
        activeUsers=active_users,
    )


def _count(sql: str, params=()) -> int:
    result = db.fetch_one(sql, params)
    return int(result["count"]) if result else 0


def _chat_sessions(user_id: int) -> list[dict]:
    return db.fetch_all(
        "SELECT id, title, created_at FROM chat_sessions WHERE user_id = %s ORDER BY created_at DESC",
        (user_id,),
    )


def _render_documents(error=None, success=None):
    documents = db.fetch_all(
        "SELECT * FROM documents WHERE user_id = %s ORDER BY created_at DESC",
        (current_user_id(),),
    )
    return render_template("documents.ejs", documents=documents, error=error, success=success)


def _user_quiz(quiz_id: int) -> dict | None:
    return db.fetch_one(
        "SELECT * FROM quizzes WHERE id = %s AND user_id = %s",
        (quiz_id, current_user_id()),
    )


def _loads_json(value, fallback):
    if isinstance(value, (list, dict)):
        return value
    if not value:
        return fallback
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return fallback


def _is_answer_correct(question: dict, user_answer: str) -> bool:
    if question.get("type") == "mcq":
        return user_answer == question.get("correct_answer")
    keywords = (question.get("correct_answer") or "").lower().split()
    user_words = set((user_answer or "").lower().split())
    if not keywords:
        return False
    matches = [keyword for keyword in keywords if keyword in user_words]
    return len(matches) >= max(1, round(len(keywords) * 0.5))


def _delete_uploaded_file(filename: str | None) -> None:
    if not filename:
        return
    file_path = Path(__file__).resolve().parents[2] / "uploads" / filename
    if file_path.exists():
        file_path.unlink()
