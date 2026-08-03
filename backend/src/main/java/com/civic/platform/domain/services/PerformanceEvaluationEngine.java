package com.civic.platform.domain.services;

import com.civic.platform.domain.entities.Complaint;
import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.enums.ComplaintStatus;
import com.civic.platform.domain.enums.Role;
import com.civic.platform.domain.repositories.ComplaintRepository;
import com.civic.platform.domain.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PerformanceEvaluationEngine {

    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;

    // Run every night at midnight
    @Scheduled(cron = "0 0 0 * * ?")
    public void evaluateOfficerPerformance() {
        System.out.println("Running Performance Evaluation Engine...");
        
        List<User> officers = userRepository.findByRole(Role.FIELD_OFFICER);
        
        for (User officer : officers) {
            List<Complaint> assignments = complaintRepository.findByAssignedOfficerId(officer.getId());
            if (assignments.isEmpty()) continue;

            double score = 100.0;
            int totalAssignments = assignments.size();
            int resolvedCount = 0;
            int slaBreachedCount = 0;
            int escalatedCount = 0;
            int reopenedCount = 0;

            for (Complaint c : assignments) {
                if (ComplaintStatus.RESOLVED == c.getStatus() || ComplaintStatus.CLOSED == c.getStatus()) {
                    resolvedCount++;
                }
                if (Boolean.TRUE.equals(c.getIsEscalated())) {
                    escalatedCount++;
                }
                if (c.getReopenCount() != null && c.getReopenCount() > 0) {
                    reopenedCount++;
                }
                if (c.getSlaDeadline() != null && ComplaintStatus.RESOLVED == c.getStatus()) {
                    if (c.getResolvedAt() != null && c.getResolvedAt().isAfter(c.getSlaDeadline())) {
                        slaBreachedCount++;
                    }
                } else if (c.getSlaDeadline() != null && !(ComplaintStatus.RESOLVED == c.getStatus() || ComplaintStatus.CLOSED == c.getStatus())) {
                    if (ZonedDateTime.now().isAfter(c.getSlaDeadline())) {
                        slaBreachedCount++;
                    }
                }
            }

            // Deductions
            double slaPenalty = (slaBreachedCount / (double) totalAssignments) * 30.0; // max 30 points off for SLA breaches
            double escalationPenalty = (escalatedCount / (double) totalAssignments) * 20.0; // max 20 points off for escalations
            double reopenPenalty = (reopenedCount / (double) totalAssignments) * 10.0; // max 10 points off for reopens
            double completionBonus = (resolvedCount / (double) totalAssignments) * 10.0; // up to 10 points bonus

            score = score - slaPenalty - escalationPenalty - reopenPenalty + completionBonus;
            score = Math.max(0, Math.min(100, score)); // Clamp between 0 and 100

            officer.setPerformanceScore(score);

            if (score >= 90) {
                officer.setPerformanceGrade("Excellent");
            } else if (score >= 75) {
                officer.setPerformanceGrade("Good");
            } else if (score >= 60) {
                officer.setPerformanceGrade("Average");
            } else if (score >= 40) {
                officer.setPerformanceGrade("Needs Improvement");
            } else {
                officer.setPerformanceGrade("Critical");
            }

            userRepository.save(officer);
        }
        System.out.println("Performance Evaluation Engine Completed.");
    }
}
