package com.civic.platform.domain.repositories;

import com.civic.platform.domain.entities.RewardTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.List;

public interface RewardTransactionRepository extends JpaRepository<RewardTransaction, UUID> {
    List<RewardTransaction> findByCitizenId(UUID citizenId);
    boolean existsByCitizenIdAndReferenceIdAndReason(UUID citizenId, UUID referenceId, String reason);

    @Modifying
    @Transactional
    @Query("DELETE FROM RewardTransaction r WHERE r.citizen.id = :citizenId")
    void deleteByCitizenId(UUID citizenId);
}
