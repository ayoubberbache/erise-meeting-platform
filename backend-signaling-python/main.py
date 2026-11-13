import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from room_manager import room_manager
from models import ParticipantState, SignalingMessage
from security import sanitize_chat_content, validate_room_code
import os
import urllib.request
import urllib.error

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("erise.main")

app = FastAPI(
    title="E-RISE WebRTC Signaling & Real-time Server",
    description="Real-time WebSockets signaling and host moderation API for the E-RISE Meeting Platform.",
    version="1.0.0"
)

# CORS configuration to protect channels & backports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CreateRoomRequest(BaseModel):
    room_code: str
    title: str
    host_id: str
    max_participants: int = 10

@app.get("/")
def root():
    return {
        "platform": "E-RISE Meeting & Broadcasting Platform",
        "service": "Signaling & Real-time WebSocket Gateway",
        "status": "online",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "active_rooms": len(room_manager.rooms),
        "timestamp": datetime.utcnow().isoformat()
    }

class EmailRequest(BaseModel):
    email: str
    fullName: Optional[str] = "E-RISE Member"
    meetingTitle: Optional[str] = "E-RISE Broadcast Meeting"
    roomCode: Optional[str] = "erise-live"
    maxCapacity: Optional[int] = 10

@app.post("/api/email/send-confirmation")
def send_confirmation_email(req: EmailRequest):
    resend_api_key = os.environ.get("RESEND_API_KEY", "")
    if not resend_api_key or "demo" in resend_api_key:
        logger.info(f"[FREE MOCK RESEND] Confirmation sent to {req.email}")
        return {"success": True, "message": "Confirmation logged (Free mode)"}

    payload = {
        "from": "E-RISE Platform <onboarding@resend.dev>",
        "to": [req.email],
        "subject": "E-RISE Platform - Account Confirmation",
        "html": f"<p>Welcome to E-RISE Platform, {req.fullName}!</p>"
    }
    try:
        r = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {resend_api_key}", "Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(r) as resp:
            return {"success": True, "status": resp.status}
    except Exception as e:
        logger.error(f"Resend error: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/email/send-invite")
def send_meeting_invite(req: EmailRequest):
    resend_api_key = os.environ.get("RESEND_API_KEY", "")
    if not resend_api_key or "demo" in resend_api_key:
        logger.info(f"[FREE MOCK RESEND] Meeting invite sent to {req.email}")
        return {"success": True, "message": "Invite logged (Free mode)"}

    payload = {
        "from": "E-RISE Platform <onboarding@resend.dev>",
        "to": [req.email],
        "subject": f"Invitation to E-RISE Meeting: {req.meetingTitle}",
        "html": f"<p>You are invited to join <strong>{req.meetingTitle}</strong> (Room: {req.roomCode}, Cap: {req.maxCapacity}).</p>"
    }
    try:
        r = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {resend_api_key}", "Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(r) as resp:
            return {"success": True, "status": resp.status}
    except Exception as e:
        logger.error(f"Resend error: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/rooms")
def create_room(req: CreateRoomRequest):
    if not validate_room_code(req.room_code):
        raise HTTPException(status_code=400, detail="Invalid room code format")
    if req.max_participants < 2 or req.max_participants > 50:
        raise HTTPException(status_code=400, detail="max_participants must be between 2 and 50")
    room = room_manager.create_or_update_room(
        room_code=req.room_code,
        title=req.title,
        host_id=req.host_id,
        max_participants=req.max_participants
    )
    return {
        "success": True,
        "room": room.model_dump()
    }

@app.get("/api/rooms/{room_code}")
def get_room_info(room_code: str):
    if room_code not in room_manager.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    room = room_manager.rooms[room_code]
    active_count = len(room_manager.active_connections.get(room_code, {}))
    return {
        "room_code": room.room_code,
        "title": room.title,
        "host_id": room.host_id,
        "max_participants": room.max_participants,
        "current_participants": active_count,
        "is_locked": room.is_locked,
        "is_full": active_count >= room.max_participants
    }

@app.websocket("/ws/{room_code}/{user_id}")
async def websocket_signaling_endpoint(websocket: WebSocket, room_code: str, user_id: str):
    # Verify participant quota limit before accepting
    allowed, err_msg = room_manager.can_join(room_code, user_id)
    if not allowed:
        await websocket.accept()
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": err_msg
        }))
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Create initial participant state
    room = room_manager.rooms[room_code]
    role = "host" if user_id == room.host_id else "participant"
    participant = ParticipantState(
        user_id=user_id,
        full_name=f"User {user_id[:6]}",
        role=role,
        is_muted=False,
        is_camera_off=False,
        is_screen_sharing=False,
        raised_hand=False
    )

    await room_manager.connect(room_code, user_id, websocket, participant)

    try:
        # Send room state to the newly connected participant
        participants_data = [p.model_dump() for p in room_manager.get_participants(room_code)]
        await websocket.send_text(json.dumps({
            "type": "room_state",
            "room_code": room_code,
            "max_participants": room.max_participants,
            "role": role,
            "participants": participants_data
        }))

        # Listen for messages
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)
            msg_type = data.get("type")

            if msg_type == "join":
                # Update participant details from profile payload
                profile = data.get("user_profile", {})
                if profile:
                    participant.full_name = profile.get("full_name", participant.full_name)
                    participant.avatar_url = profile.get("avatar_url", "")
                
                # Notify existing participants in the room
                await room_manager.broadcast_to_room(room_code, {
                    "type": "user_joined",
                    "user_id": user_id,
                    "user_profile": participant.model_dump(),
                    "participants": [p.model_dump() for p in room_manager.get_participants(room_code)]
                }, exclude_user_id=user_id)

            elif msg_type in ("offer", "answer", "candidate"):
                # Direct peer-to-peer WebRTC exchange
                target_id = data.get("target_id")
                if target_id:
                    data["user_id"] = user_id
                    await room_manager.send_to_user(room_code, target_id, data)

            elif msg_type == "hand_raise":
                # Participant raises or lowers hand
                raised = data.get("raised", False)
                participant.raised_hand = raised
                participant.hand_raised_at = datetime.utcnow().isoformat() if raised else None
                await room_manager.broadcast_to_room(room_code, {
                    "type": "hand_raise",
                    "user_id": user_id,
                    "raised": raised,
                    "hand_raised_at": participant.hand_raised_at,
                    "participants": [p.model_dump() for p in room_manager.get_participants(room_code)]
                })

            elif msg_type == "host_action":
                # Host moderation controls (Mute, Camera Off, Screen Share Off, Kick)
                # Verify caller is host
                if participant.role != "host":
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Permission denied: Only the meet host can perform moderation actions."
                    }))
                    continue

                action = data.get("action")
                target_id = data.get("target_id")

                if action == "mute" and target_id:
                    target = room_manager.get_participant(room_code, target_id)
                    if target:
                        target.is_muted = True
                    await room_manager.broadcast_to_room(room_code, {
                        "type": "host_action",
                        "action": "mute",
                        "target_id": target_id,
                        "participants": [p.model_dump() for p in room_manager.get_participants(room_code)]
                    })

                elif action == "unmute" and target_id:
                    target = room_manager.get_participant(room_code, target_id)
                    if target:
                        target.is_muted = False
                    await room_manager.broadcast_to_room(room_code, {
                        "type": "host_action",
                        "action": "unmute",
                        "target_id": target_id,
                        "participants": [p.model_dump() for p in room_manager.get_participants(room_code)]
                    })

                elif action == "stop_camera" and target_id:
                    target = room_manager.get_participant(room_code, target_id)
                    if target:
                        target.is_camera_off = True
                    await room_manager.broadcast_to_room(room_code, {
                        "type": "host_action",
                        "action": "stop_camera",
                        "target_id": target_id,
                        "participants": [p.model_dump() for p in room_manager.get_participants(room_code)]
                    })

                elif action == "stop_screen" and target_id:
                    target = room_manager.get_participant(room_code, target_id)
                    if target:
                        target.is_screen_sharing = False
                    await room_manager.broadcast_to_room(room_code, {
                        "type": "host_action",
                        "action": "stop_screen",
                        "target_id": target_id,
                        "participants": [p.model_dump() for p in room_manager.get_participants(room_code)]
                    })

                elif action == "lock_room":
                    room.is_locked = True
                    await room_manager.broadcast_to_room(room_code, {
                        "type": "host_action",
                        "action": "lock_room"
                    })

                elif action == "unlock_room":
                    room.is_locked = False
                    await room_manager.broadcast_to_room(room_code, {
                        "type": "host_action",
                        "action": "unlock_room"
                    })

                elif action == "kick" and target_id:
                    await room_manager.send_to_user(room_code, target_id, {
                        "type": "error",
                        "message": "You have been removed from the meeting by the host."
                    })

            elif msg_type == "chat_message":
                # In-meeting chat with XSS sanitization
                raw_content = data.get("content", "")
                data["content"] = sanitize_chat_content(raw_content)
                data["timestamp"] = datetime.utcnow().isoformat()
                data["sender_id"] = user_id
                await room_manager.broadcast_to_room(room_code, data)

    except WebSocketDisconnect:
        await room_manager.disconnect(room_code, user_id)
    except Exception as e:
        logger.error(f"WebSocket exception for {user_id}: {e}")
        await room_manager.disconnect(room_code, user_id)
