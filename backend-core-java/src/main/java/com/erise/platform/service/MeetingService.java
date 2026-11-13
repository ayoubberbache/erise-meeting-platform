package com.erise.platform.service;

import com.erise.platform.model.CreateMeetingRequest;
import com.erise.platform.model.MeetingParticipant;
import com.erise.platform.model.MeetingRoom;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MeetingService {
    private final Map<String, MeetingRoom> roomsByCode = new ConcurrentHashMap<>();

    public MeetingRoom createMeeting(CreateMeetingRequest request) {
        String code = request.getRoomCode();
        if (code == null || code.trim().isEmpty()) {
            code = generateRoomCode();
        } else {
            code = code.trim().toLowerCase();
        }

        String id = UUID.randomUUID().toString();
        MeetingRoom room = new MeetingRoom(
                id,
                request.getTitle(),
                code,
                request.getHostId(),
                request.getMaxParticipants()
        );

        roomsByCode.put(code, room);
        return room;
    }

    public Optional<MeetingRoom> getMeetingByCode(String code) {
        if (code == null) return Optional.empty();
        return Optional.ofNullable(roomsByCode.get(code.trim().toLowerCase()));
    }

    public synchronized Map<String, Object> joinMeeting(String code, String userId, String fullName) {
        Map<String, Object> response = new HashMap<>();
        Optional<MeetingRoom> optionalRoom = getMeetingByCode(code);

        if (optionalRoom.isEmpty()) {
            response.put("success", false);
            response.put("error", "Meeting not found");
            return response;
        }

        MeetingRoom room = optionalRoom.get();

        if (room.isEnded()) {
            response.put("success", false);
            response.put("error", "Meeting has ended");
            return response;
        }

        if (room.isLocked() && !userId.equals(room.getHostId())) {
            response.put("success", false);
            response.put("error", "Meeting is locked by the host");
            return response;
        }

        String role = userId.equals(room.getHostId()) ? "host" : "participant";
        MeetingParticipant participant = new MeetingParticipant(userId, fullName, role);

        boolean admitted = room.addParticipant(participant);
        if (!admitted) {
            response.put("success", false);
            response.put("error", "Meeting is full. Capacity limit: " + room.getMaxParticipants() + " participants");
            response.put("maxParticipants", room.getMaxParticipants());
            response.put("currentCount", room.getCurrentParticipantsCount());
            return response;
        }

        response.put("success", true);
        response.put("roomCode", room.getRoomCode());
        response.put("title", room.getTitle());
        response.put("role", role);
        response.put("maxParticipants", room.getMaxParticipants());
        response.put("currentCount", room.getCurrentParticipantsCount());
        return response;
    }

    public void leaveMeeting(String code, String userId) {
        getMeetingByCode(code).ifPresent(room -> room.removeParticipant(userId));
    }

    public boolean endMeeting(String code, String hostId) {
        Optional<MeetingRoom> optionalRoom = getMeetingByCode(code);
        if (optionalRoom.isPresent()) {
            MeetingRoom room = optionalRoom.get();
            if (room.getHostId().equals(hostId)) {
                room.setEnded(true);
                return true;
            }
        }
        return false;
    }

    public List<MeetingRoom> listActiveMeetings() {
        return roomsByCode.values().stream()
                .filter(room -> !room.isEnded())
                .toList();
    }

    private String generateRoomCode() {
        String chars = "abcdefghijklmnopqrstuvwxyz";
        Random random = new Random();
        StringBuilder part1 = new StringBuilder();
        StringBuilder part2 = new StringBuilder();
        StringBuilder part3 = new StringBuilder();
        for (int i = 0; i < 3; i++) part1.append(chars.charAt(random.nextInt(chars.length())));
        for (int i = 0; i < 4; i++) part2.append(chars.charAt(random.nextInt(chars.length())));
        for (int i = 0; i < 3; i++) part3.append(chars.charAt(random.nextInt(chars.length())));
        return "erise-" + part1 + "-" + part2;
    }
}
