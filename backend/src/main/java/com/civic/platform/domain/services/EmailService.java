package com.civic.platform.domain.services;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otp) {
        if (toEmail == null || toEmail.isEmpty() || fromEmail == null || fromEmail.isEmpty()) return;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("Your CivicResolve Email Verification OTP");
        message.setText("Your OTP for updating your email is: " + otp + "\n\nThis OTP is valid for 5 minutes.");
        try {
            javaMailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send OTP email: " + e.getMessage());
        }
    }

    public void sendEscalationEmail(String toEmail, String complaintId, String level) {
        if (toEmail == null || toEmail.isEmpty() || fromEmail == null || fromEmail.isEmpty()) return;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("CivicResolve Alert: Issue Escalated");
        message.setText("Your complaint (ID: " + complaintId + ") has breached its SLA and has been escalated to " + level + ".");
        try {
            javaMailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send escalation email: " + e.getMessage());
        }
    }

    public void sendResolutionEmail(String toEmail, String complaintId) {
        if (toEmail == null || toEmail.isEmpty() || fromEmail == null || fromEmail.isEmpty()) return;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("CivicResolve Update: Issue Resolved");
        message.setText("Good news! Your complaint (ID: " + complaintId + ") has been marked as RESOLVED by the field officer. Please log in to verify the resolution.");
        try {
            javaMailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send resolution email: " + e.getMessage());
        }
    }
}
