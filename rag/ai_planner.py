import json
import datetime
from generator import call_deepseek 

def parse_calendar_query(query, current_time_str):
    """
    Parse a user query for calendar scheduling or daily planning.
    current_time_str is in ISO format, e.g. '2026-07-07T14:45:00'
    """
    prompt = f"""You are an AI Calendar Planner. Your job is to parse the user's request and output a structured JSON response to either schedule a single event or generate a daily plan.

Current Time/Date context: {current_time_str}

Determine which action is requested:
1. "daily_plan": The user describes what they want to achieve today/for the day. You create a structured daily study schedule containing multiple events.
2. "create_event": The user wants to schedule a specific event (e.g., "Study math tomorrow at 3pm for 2 hours").
3. "clarify": The user query is vague or unrelated to calendar scheduling.

You MUST respond with ONLY a valid JSON object. No markdown blocks, no extra text.

JSON Schema to return:
{{
  "action": "create_event" | "daily_plan" | "clarify",
  "reply": "A helpful assistant message to the user explaining what you did",
  "events": [
    {{
      "title": "Clean, descriptive event title (e.g., '📖 Study: Math homework' or '📝 Practice: Coding')",
      "start_time": "YYYY-MM-DDTHH:MM:SS format representing local start time",
      "end_time": "YYYY-MM-DDTHH:MM:SS format representing local end time"
    }}
  ]
}}

Guidelines for start_time and end_time calculation:
- Use the Current Time/Date context: {current_time_str} as the base reference point.
- Calculate "tomorrow", "next Monday", "this Friday", "at 3pm", etc., accurately relative to that base date.
- If no duration is specified for an event, default to 1 hour.
- Ensure times are formatted strictly as 'YYYY-MM-DDTHH:MM:SS'.

User Query:
"{query}"

Response JSON:"""

    response = call_deepseek(prompt)
    if response:
        try:
            # Clean response markup if any
            json_str = response.strip()
            if "```" in json_str:
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            
            start = json_str.find("{")
            end = json_str.rfind("}") + 1
            if start >= 0 and end > start:
                parsed = json.loads(json_str[start:end])
                return parsed
        except Exception as e:
            print("Failed to parse calendar query response:", e)
            print("Original response:", response)
            
    return {
        "action": "clarify",
        "reply": "I couldn't process that schedule. Could you please specify the event name, date, and time clearly?",
        "events": []
    }
