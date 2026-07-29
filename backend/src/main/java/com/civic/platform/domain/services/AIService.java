package com.civic.platform.domain.services;

import com.civic.platform.domain.entities.Complaint;
import com.civic.platform.domain.enums.ComplaintStatus;
import com.civic.platform.domain.repositories.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIService {

    private final ComplaintRepository complaintRepository;

    /**
     * Async listener stub representing the callback from the AI Inference Pipeline.
     * Maps to Phase 4: AI Model Pipeline.
     */
    @Async
    @Transactional
    public void processInferenceResult(UUID complaintId, String detectedCategory, double confidence) {
        log.info("Received AI inference for complaint {}: {} (Confidence: {})", complaintId, detectedCategory, confidence);

        Complaint complaint = complaintRepository.findById(complaintId).orElse(null);
        if (complaint == null) return;

        // In a full system, we would map the detected category to the department
        // and trigger the geo-routing assignment here.

        complaint.setAiConfidenceScore(BigDecimal.valueOf(confidence));
        
        if (confidence >= 0.70) {
            complaint.setStatus(ComplaintStatus.VERIFIED);
        } else {
            // Requires manual review if confidence is too low
            complaint.setStatus(ComplaintStatus.REPORTED);
        }

        complaintRepository.save(complaint);
    }
}
