package com.civic.platform.domain.services;

import com.civic.platform.domain.entities.Complaint;
import com.civic.platform.domain.entities.Escalation;
import com.civic.platform.domain.entities.Notification;
import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.repositories.ComplaintRepository;
import com.civic.platform.domain.repositories.EscalationRepository;
import com.civic.platform.domain.repositories.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SLAService {

    private final ComplaintRepository complaintRepository;
    private final EscalationRepository escalationRepository;
    private final NotificationRepository notificationRepository;
    private final AssignmentService assignmentService;
    private final EmailService emailService;
    private final PushNotificationService pushNotificationService;

    /**
     * Runs every 15 minutes to check for SLA breaches.
     * Maps to Phase 4: Escalation Workflow Engine.
     */
    @Scheduled(cron = "0 0/15 * * * ?")
    @Transactional
    public void checkSlaBreaches() {
        log.info("Running SLA Breach Checker Cron...");
        
        ZonedDateTime now = ZonedDateTime.now();
        List<Complaint> breachedComplaints = complaintRepository.findBreachedComplaints(now);

        for (Complaint complaint : breachedComplaints) {
            if (complaint.getCreatedAt() == null || complaint.getSlaDeadline() == null) {
                continue;
            }
            
            // Determine percentage elapsed
            long deadlineEpoch = complaint.getSlaDeadline().toEpochSecond();
            long createdEpoch = complaint.getCreatedAt().toEpochSecond();
            long nowEpoch = now.toEpochSecond();
            
            long totalDuration = deadlineEpoch - createdEpoch;
            if (totalDuration <= 0) totalDuration = 1;
            long elapsedDuration = nowEpoch - createdEpoch;
            
            double percentElapsed = (double) elapsedDuration / totalDuration * 100.0;

            if (percentElapsed >= 200.0) {
                escalateTo(complaint, "MUNICIPAL_COMMISSIONER", percentElapsed);
            } else if (percentElapsed >= 150.0) {
                escalateTo(complaint, "EXECUTIVE_ENGINEER", percentElapsed);
            } else if (percentElapsed >= 100.0) {
                escalateTo(complaint, "ASSISTANT_ENGINEER", percentElapsed);
            }
        }
    }

    @Transactional
    public void escalateTo(Complaint complaint, String level, double percentElapsed) {
        if (escalationRepository.existsByComplaintIdAndLevel(complaint.getId(), level)) {
            return; // Idempotent check
        }

        log.warn("Escalating complaint {} to {}", complaint.getId(), level);

        complaint.setIsEscalated(true);
        String deptName = assignmentService.resolveDepartment(complaint.getCategory());
        Optional<User> superior = assignmentService.findSuperiorOfficer(deptName, complaint.getLatitude(), complaint.getLongitude(), level);
        superior.ifPresent(u -> complaint.setSuperiorOfficerId(u.getId()));
        
        complaintRepository.save(complaint);

        Escalation esc = new Escalation();
        esc.setComplaint(complaint);
        esc.setLevel(level);
        esc.setReason("SLA resolution timeline breached. Time elapsed: " + String.format("%.1f", percentElapsed) + "% of allocated SLA duration.");
        escalationRepository.save(esc);

        if (complaint.getCitizen() != null) {
            Notification notif = new Notification();
            notif.setCitizen(complaint.getCitizen());
            notif.setReferenceId(complaint.getId());
            notif.setTitle("⚠️ Issue Escalated");
            notif.setMessage("Your report for " + complaint.getCategory() + " exceeded its SLA resolution timeline and was automatically escalated to " + level + (superior.isPresent() ? " (" + superior.get().getName() + ")" : "") + " for immediate intervention.");
            notificationRepository.save(notif);
            
            // Phase 2: Zero-cost Email and Push notification
            emailService.sendEscalationEmail(complaint.getCitizen().getEmail(), complaint.getId().toString(), level);
            pushNotificationService.sendPushNotification(complaint.getCitizen().getEmail(), notif.getTitle(), notif.getMessage());
        }
    }
}
