package com.erise.platform.model;

import java.time.Instant;

public class MeetingParticipant {
    private String userId;
    private String fullName;
    private String role; // "host", "co-host", "participant"
    private boolean muted;
    private boolean cameraOff;
    private boolean screenSharing;
    private boolean raisedHand;
    private Instant joinedAt;

    public MeetingParticipant() {
        this.joinedAt = Instant.now();
    }

    public MeetingParticipant(String userId, String fullName, String role) {
        this.userId = userId;
        this.fullName = fullName;
        this.role = role;
        this.muted = false;
        this.cameraOff = false;
        this.screenSharing = false;
        this.raisedHand = false;
        this.joinedAt = Instant.now();
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public boolean isMuted() { return muted; }
    public void setMuted(boolean muted) { this.muted = muted; }

    public boolean isCameraOff() { return cameraOff; }
    public void setCameraOff(boolean cameraOff) { this.cameraOff = cameraOff; }

    public boolean isScreenSharing() { return screenSharing; }
    public void setScreenSharing(boolean screenSharing) { this.screenSharing = screenSharing; }

    public boolean isRaisedHand() { return raisedHand; }
    public void setRaisedHand(boolean raisedHand) { this.raisedHand = raisedHand; }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }
}
