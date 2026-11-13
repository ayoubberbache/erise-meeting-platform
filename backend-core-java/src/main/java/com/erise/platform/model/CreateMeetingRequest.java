package com.erise.platform.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class CreateMeetingRequest {
    @NotBlank(message = "Meeting title is required")
    private String title;

    private String roomCode;

    @NotBlank(message = "Host ID is required")
    private String hostId;

    @Min(value = 2, message = "Minimum 2 participants required")
    @Max(value = 50, message = "Maximum 50 participants allowed")
    private int maxParticipants = 10;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public String getHostId() { return hostId; }
    public void setHostId(String hostId) { this.hostId = hostId; }

    public int getMaxParticipants() { return maxParticipants; }
    public void setMaxParticipants(int maxParticipants) { this.maxParticipants = maxParticipants; }
}
