package com.erise.platform.model;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class MeetingRoom {
    private String id;
    private String title;
    private String roomCode;
    private String hostId;
    private int maxParticipants;
    private boolean locked;
    private boolean ended;
    private Instant createdAt;
    private final Map<String, MeetingParticipant> activeParticipants = new ConcurrentHashMap<>();

    public MeetingRoom() {
        this.createdAt = Instant.now();
        this.maxParticipants = 10; // Default capacity as per specs
    }

    public MeetingRoom(String id, String title, String roomCode, String hostId, int maxParticipants) {
        this.id = id;
        this.title = title;
        this.roomCode = roomCode;
        this.hostId = hostId;
        this.maxParticipants = Math.max(2, Math.min(maxParticipants, 50));
        this.locked = false;
        this.ended = false;
        this.createdAt = Instant.now();
    }

    public synchronized boolean canJoin(String userId) {
        if (ended) return false;
        if (locked && !userId.equals(hostId)) return false;
        if (activeParticipants.containsKey(userId)) return true; // Already joined
        return activeParticipants.size() < maxParticipants;
    }

    public synchronized boolean addParticipant(MeetingParticipant participant) {
        if (!canJoin(participant.getUserId())) {
            return false;
        }
        activeParticipants.put(participant.getUserId(), participant);
        return true;
    }

    public synchronized void removeParticipant(String userId) {
        activeParticipants.remove(userId);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public String getHostId() { return hostId; }
    public void setHostId(String hostId) { this.hostId = hostId; }

    public int getMaxParticipants() { return maxParticipants; }
    public void setMaxParticipants(int maxParticipants) { 
        this.maxParticipants = Math.max(2, Math.min(maxParticipants, 50)); 
    }

    public boolean isLocked() { return locked; }
    public void setLocked(boolean locked) { this.locked = locked; }

    public boolean isEnded() { return ended; }
    public void setEnded(boolean ended) { this.ended = ended; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public int getCurrentParticipantsCount() {
        return activeParticipants.size();
    }

    public Map<String, MeetingParticipant> getActiveParticipants() {
        return Collections.unmodifiableMap(activeParticipants);
    }
}
