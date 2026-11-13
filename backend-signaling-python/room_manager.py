import json
import logging
from typing import Dict, List, Optional
from fastapi import WebSocket
from models import ParticipantState, RoomMetadata

logger = logging.getLogger("erise.room_manager")

class RoomManager:
    def __init__(self):
        # room_code -> Dict[user_id, WebSocket]
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # room_code -> Dict[user_id, ParticipantState]
        self.room_participants: Dict[str, Dict[str, ParticipantState]] = {}
        # room_code -> RoomMetadata
        self.rooms: Dict[str, RoomMetadata] = {}

    def create_or_update_room(self, room_code: str, title: str, host_id: str, max_participants: int = 10) -> RoomMetadata:
        if room_code not in self.rooms:
            self.rooms[room_code] = RoomMetadata(
                room_code=room_code,
                title=title,
                host_id=host_id,
                max_participants=max_participants,
                is_locked=False
            )
            self.active_connections[room_code] = {}
            self.room_participants[room_code] = {}
        else:
            self.rooms[room_code].max_participants = max_participants
            self.rooms[room_code].title = title
        return self.rooms[room_code]

    def can_join(self, room_code: str, user_id: str) -> tuple[bool, str]:
        if room_code not in self.rooms:
            # Default room with capacity 10 if auto-joining
            self.create_or_update_room(room_code, "E-RISE Meeting", user_id, 10)

        room = self.rooms[room_code]
        
        # If user is already in the room, allow reconnect
        if user_id in self.active_connections.get(room_code, {}):
            return True, ""

        if room.is_locked and user_id != room.host_id:
            return False, "This meeting is locked by the host."

        current_count = len(self.active_connections.get(room_code, {}))
        if current_count >= room.max_participants:
            return False, f"Meeting room is full. Capacity limit: {room.max_participants} participants."

        return True, ""

    async def connect(self, room_code: str, user_id: str, websocket: WebSocket, participant: ParticipantState):
        await websocket.accept()
        if room_code not in self.active_connections:
            self.active_connections[room_code] = {}
            self.room_participants[room_code] = {}

        self.active_connections[room_code][user_id] = websocket
        self.room_participants[room_code][user_id] = participant
        logger.info(f"User {user_id} joined room {room_code}. Current participants: {len(self.active_connections[room_code])}")

    async def disconnect(self, room_code: str, user_id: str):
        if room_code in self.active_connections and user_id in self.active_connections[room_code]:
            del self.active_connections[room_code][user_id]
        if room_code in self.room_participants and user_id in self.room_participants[room_code]:
            del self.room_participants[room_code][user_id]

        logger.info(f"User {user_id} left room {room_code}.")
        # Notify others
        await self.broadcast_to_room(room_code, {
            "type": "user_left",
            "user_id": user_id,
            "participants": [p.model_dump() for p in self.get_participants(room_code)]
        }, exclude_user_id=user_id)

        # Cleanup empty room if not persistent
        if room_code in self.active_connections and len(self.active_connections[room_code]) == 0:
            del self.active_connections[room_code]
            del self.room_participants[room_code]

    def get_participants(self, room_code: str) -> List[ParticipantState]:
        return list(self.room_participants.get(room_code, {}).values())

    def get_participant(self, room_code: str, user_id: str) -> Optional[ParticipantState]:
        return self.room_participants.get(room_code, {}).get(user_id)

    async def send_to_user(self, room_code: str, user_id: str, message: dict):
        ws = self.active_connections.get(room_code, {}).get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {e}")

    async def broadcast_to_room(self, room_code: str, message: dict, exclude_user_id: Optional[str] = None):
        connections = self.active_connections.get(room_code, {})
        payload = json.dumps(message)
        for uid, ws in list(connections.items()):
            if exclude_user_id and uid == exclude_user_id:
                continue
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.error(f"Error broadcasting to {uid}: {e}")

room_manager = RoomManager()
