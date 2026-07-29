package com.civic.platform.domain.repositories;

import com.civic.platform.domain.entities.Escalation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EscalationRepository extends JpaRepository<Escalation, UUID> {
    List<Escalation> findByComplaintId(UUID complaintId);
    boolean existsByComplaintIdAndLevel(UUID complaintId, String level);
}
