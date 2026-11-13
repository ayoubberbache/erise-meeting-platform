package com.erise.platform.controller;

import com.erise.platform.model.CreateMeetingRequest;
import com.erise.platform.model.MeetingRoom;
import com.erise.platform.service.MeetingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/meetings")
public class MeetingController {

    private final MeetingService meetingService;

    public MeetingController(MeetingService meetingService) {
        this.meetingService = meetingService;
    }

    @PostMapping
    public ResponseEntity<MeetingRoom> createMeeting(@Valid @RequestBody CreateMeetingRequest request) {
        MeetingRoom room = meetingService.createMeeting(request);
        return new ResponseEntity<>(room, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<MeetingRoom>> listActiveMeetings() {
        return ResponseEntity.ok(meetingService.listActiveMeetings());
    }

    @GetMapping("/{roomCode}")
    public ResponseEntity<?> getMeeting(@PathVariable String roomCode) {
        Optional<MeetingRoom> room = meetingService.getMeetingByCode(roomCode);
        if (room.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Meeting room not found"));
        }
        MeetingRoom r = room.get();
        return ResponseEntity.ok(Map.of(
                "id", r.getId(),
                "title", r.getTitle(),
                "roomCode", r.getRoomCode(),
                "hostId", r.getHostId(),
                "maxParticipants", r.getMaxParticipants(),
                "currentParticipants", r.getCurrentParticipantsCount(),
                "isLocked", r.isLocked(),
                "isEnded", r.isEnded(),
                "isFull", r.getCurrentParticipantsCount() >= r.getMaxParticipants()
        ));
    }

    @PostMapping("/{roomCode}/join")
    public ResponseEntity<?> joinMeeting(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> payload
    ) {
        String userId = payload.get("userId");
        String fullName = payload.getOrDefault("fullName", "Guest Participant");

        if (userId == null || userId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId is required"));
        }

        Map<String, Object> result = meetingService.joinMeeting(roomCode, userId, fullName);
        boolean success = (boolean) result.getOrDefault("success", false);

        if (!success) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(result);
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/{roomCode}/leave")
    public ResponseEntity<?> leaveMeeting(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> payload
    ) {
        String userId = payload.get("userId");
        if (userId != null) {
            meetingService.leaveMeeting(roomCode, userId);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/{roomCode}/end")
    public ResponseEntity<?> endMeeting(
            @PathVariable String roomCode,
            @RequestBody Map<String, String> payload
    ) {
        String hostId = payload.get("hostId");
        if (hostId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "hostId is required"));
        }
        boolean ended = meetingService.endMeeting(roomCode, hostId);
        if (!ended) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Unauthorized or meeting already ended"));
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Meeting ended successfully"));
    }
}
