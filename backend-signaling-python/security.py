import html
import re

def sanitize_chat_content(text: str) -> str:
    """Sanitizes user input to prevent XSS and script injection across broadcast channels."""
    if not text:
        return ""
    # Strip HTML tags
    clean_text = html.escape(text.strip())
    # Limit max length
    return clean_text[:1000]

def validate_room_code(code: str) -> bool:
    """Ensures room code contains only safe alphanumeric and hyphen characters."""
    if not code or len(code) > 64:
        return False
    return bool(re.match(r"^[a-zA-Z0-9_-]+$", code))
