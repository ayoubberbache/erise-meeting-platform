package com.erise.platform.controller;

import com.erise.platform.model.EmailNotificationRequest;
import com.erise.platform.service.ResendEmailService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    private final ResendEmailService emailService;

    public EmailController(ResendEmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/send-confirmation")
    public ResponseEntity<?> sendConfirmation(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String fullName = payload.getOrDefault("fullName", "E-RISE Member");
        String confirmationLink = payload.getOrDefault("confirmationLink", "https://e-rise-platform.web.app/confirm");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "email is required"));
        }

        boolean sent = emailService.sendAccountConfirmation(email, fullName, confirmationLink);
        return ResponseEntity.ok(Map.of("success", sent, "message", sent ? "Confirmation email dispatched" : "Failed to dispatch email"));
    }

    @PostMapping("/send-invite")
    public ResponseEntity<?> sendInvite(@RequestBody Map<String, Object> payload) {
        String email = (String) payload.get("email");
        String meetingTitle = (String) payload.getOrDefault("meetingTitle", "E-RISE Broadcast Meeting");
        String roomCode = (String) payload.getOrDefault("roomCode", "erise-live-room");
        String hostName = (String) payload.getOrDefault("hostName", "E-RISE Host");
        int maxCapacity = (int) payload.getOrDefault("maxCapacity", 10);

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "email is required"));
        }

        boolean sent = emailService.sendMeetingInvitation(email, meetingTitle, roomCode, hostName, maxCapacity);
        return ResponseEntity.ok(Map.of("success", sent, "message", sent ? "Invitation dispatched" : "Failed to dispatch invite"));
    }
}
