from typing import Optional, List, Literal, Any, Dict
from pydantic import BaseModel, Field

class ParticipantState(BaseModel):
    user_id: str
    full_name: str
    avatar_url: Optional[str] = ""
    role: Literal["host", "co-host", "participant"] = "participant"
    is_muted: bool = False
    is_camera_off: bool = False
    is_screen_sharing: bool = False
    raised_hand: bool = False
    hand_raised_at: Optional[str] = None

class RoomMetadata(BaseModel):
    room_code: str
    title: str
    host_id: str
    max_participants: int = 10
    is_locked: bool = False

class SignalingMessage(BaseModel):
    type: Literal[
        "join",
        "joined",
        "offer",
        "answer",
        "candidate",
        "user_joined",
        "user_left",
        "host_action",
        "hand_raise",
        "chat_message",
        "room_state",
        "error"
    ]
    room_code: Optional[str] = None
    user_id: Optional[str] = None
    target_id: Optional[str] = None
    user_profile: Optional[Dict[str, Any]] = None
    sdp: Optional[Dict[str, Any]] = None
    candidate: Optional[Dict[str, Any]] = None
    action: Optional[Literal["mute", "unmute", "stop_camera", "stop_screen", "kick", "lock_room", "unlock_room"]] = None
    raised: Optional[bool] = None
    message: Optional[str] = None
    participants: Optional[List[ParticipantState]] = None
    max_participants: Optional[int] = None
