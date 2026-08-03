package com.civic.platform.domain.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class PushNotificationService {

    // In a full production environment, you would inject FirebaseMessaging here.
    // e.g. private final FirebaseMessaging firebaseMessaging;

    public void sendPushNotification(String userEmail, String title, String message) {
        if (userEmail == null || userEmail.isEmpty()) return;
        
        // Zero-Cost Implementation: Log the push notification intention.
        // To enable real FCM, add firebase-admin to pom.xml, configure FirebaseApp with service-account.json,
        // and use FirebaseMessaging.getInstance().send(Message.builder()...)
        
        log.info("📱 [FCM PUSH MOCK] Sending push notification to {}: Title: '{}', Message: '{}'", 
                 userEmail, title, message);
    }
}
