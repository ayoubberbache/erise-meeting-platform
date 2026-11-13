package com.erise.platform.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ResendEmailService {
    private static final Logger log = LoggerFactory.getLogger(ResendEmailService.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    @Value("${resend.api.key}")
    private String resendApiKey;

    @Value("${resend.from.email}")
    private String fromEmail;

    @Value("${resend.admin.email}")
    private String adminEmail;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ResendEmailService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public boolean sendAccountConfirmation(String toEmail, String fullName, String confirmationLink) {
        String subject = "Welcome to E-RISE Platform - Confirm Your Account";
        String html = """
            <div style="font-family: 'Inter', sans-serif; background-color: #0B1320; color: #FFFFFF; padding: 40px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #00838F;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #00838F; margin: 0; font-size: 28px; letter-spacing: 2px;">E-RISE</h1>
                    <p style="color: #94A3B8; margin-top: 4px; font-size: 14px;">Next-Gen Hybrid Streaming & Meeting Platform</p>
                </div>
                <div style="background-color: #142238; padding: 30px; border-radius: 8px; border: 1px solid rgba(0, 131, 143, 0.3);">
                    <h2 style="color: #FFFFFF; margin-top: 0;">Welcome, %s!</h2>
                    <p style="color: #CBD5E1; line-height: 1.6;">Your E-RISE account is ready to be activated. Enjoy seamless high-definition broadcasting, granular host controls, and low-latency audio/video mesh.</p>
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="%s" style="background-color: #00838F; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Confirm My Account</a>
                    </div>
                    <p style="color: #64748B; font-size: 12px;">If you didn't request this email, you can safely ignore it.</p>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #64748B; font-size: 12px;">
                    &copy; E-RISE Platform. Hosted for erise.club@hns-re2sd.dz
                </div>
            </div>
        """.formatted(fullName, confirmationLink);

        return sendEmail(toEmail, subject, html);
    }

    public boolean sendMeetingInvitation(String toEmail, String meetingTitle, String roomCode, String hostName, int maxCapacity) {
        String subject = "Invitation to E-RISE Meeting: " + meetingTitle;
        String html = """
            <div style="font-family: 'Inter', sans-serif; background-color: #0B1320; color: #FFFFFF; padding: 40px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #00838F;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #00838F; margin: 0; font-size: 28px; letter-spacing: 2px;">E-RISE</h1>
                    <p style="color: #94A3B8; margin-top: 4px; font-size: 14px;">Broadcasting &amp; Meeting Invitation</p>
                </div>
                <div style="background-color: #142238; padding: 30px; border-radius: 8px; border: 1px solid rgba(0, 131, 143, 0.3);">
                    <h2 style="color: #FFFFFF; margin-top: 0;">%s</h2>
                    <p style="color: #CBD5E1; line-height: 1.6;"><strong>%s</strong> has invited you to join an active meeting room.</p>
                    <div style="background-color: #0B1320; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #00838F;">
                        <p style="margin: 5px 0; color: #94A3B8;">Room Code: <strong style="color: #00838F;">%s</strong></p>
                        <p style="margin: 5px 0; color: #94A3B8;">Max Room Capacity: <strong style="color: #FFFFFF;">%d participants</strong></p>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #64748B; font-size: 12px;">
                    &copy; E-RISE Platform. Contact: %s
                </div>
            </div>
        """.formatted(meetingTitle, hostName, roomCode, maxCapacity, adminEmail);

        return sendEmail(toEmail, subject, html);
    }

    public boolean sendEmail(String toEmail, String subject, String htmlContent) {
        if (resendApiKey == null || resendApiKey.contains("demo") || resendApiKey.isBlank()) {
            log.info("[MOCK RESEND] Sending email to: {} | Subject: {}", toEmail, subject);
            return true;
        }

        try {
            Map<String, Object> body = new HashMap<>();
            body.put("from", fromEmail);
            body.put("to", List.of(toEmail));
            body.put("subject", subject);
            body.put("html", htmlContent);

            String requestBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_API_URL))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Resend API response status: {}", response.statusCode());
            return response.statusCode() >= 200 && response.statusCode() < 300;
        } catch (Exception e) {
            log.error("Failed to send email via Resend API: {}", e.getMessage(), e);
            return false;
        }
    }
}
