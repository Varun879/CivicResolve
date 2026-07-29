package com.civic.platform.domain.services;

import com.civic.platform.domain.entities.Complaint;
import com.civic.platform.domain.repositories.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeoService {

    private final ComplaintRepository complaintRepository;

    /**
     * Executes the spatial-temporal duplicate detection algorithm.
     * Matches Phase 4 logic: ≤50m distance, <72 hours, matching category.
     */
    public Optional<Complaint> findDuplicate(Complaint newComplaint) {
        ZonedDateTime cutoff = ZonedDateTime.now().minusHours(72);
        
        List<Complaint> candidates = complaintRepository.findPotentialDuplicates(
                newComplaint.getCategory().name(), 
                cutoff, 
                newComplaint.getLatitude().doubleValue(), 
                newComplaint.getLongitude().doubleValue()
        );

        if (!candidates.isEmpty()) {
            // In a full implementation, we would compare visual embeddings here (sim >= 0.85).
            // For now, we return the first spatial-temporal match.
            Complaint duplicate = candidates.get(0);
            log.info("Duplicate found: new complaint matches existing ID {}", duplicate.getId());
            return Optional.of(duplicate);
        }

        return Optional.empty();
    }
}
