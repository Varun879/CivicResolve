package com.civic.platform.domain.services;

import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.enums.RewardLevel;
import com.civic.platform.domain.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RewardService {

    private final UserRepository userRepository;
    private final com.civic.platform.domain.repositories.RewardTransactionRepository rewardTransactionRepository;

    /**
     * Maps to Phase 4: Reward Engine (Gamification).
     */
    @Transactional
    public void allocatePoints(User citizen, int points, String reason, java.util.UUID referenceId) {
        // Idempotency check
        if (referenceId != null && rewardTransactionRepository.existsByCitizenIdAndReferenceIdAndReason(citizen.getId(), referenceId, reason)) {
            log.info("Points already awarded for citizen {} with reference {} and reason {}", citizen.getId(), referenceId, reason);
            return;
        }

        int newPoints = citizen.getPoints() + points;
        citizen.setPoints(newPoints);
        
        // Tier evaluation
        if (newPoints >= 1500) {
            citizen.setRewardLevel(RewardLevel.CITY_GUARDIAN.name());
        } else if (newPoints >= 700) {
            citizen.setRewardLevel(RewardLevel.DIAMOND.name());
        } else if (newPoints >= 300) {
            citizen.setRewardLevel(RewardLevel.GOLD.name());
        } else if (newPoints >= 100) {
            citizen.setRewardLevel(RewardLevel.SILVER.name());
        } else {
            citizen.setRewardLevel(RewardLevel.BRONZE.name());
        }

        userRepository.save(citizen);

        com.civic.platform.domain.entities.RewardTransaction tx = new com.civic.platform.domain.entities.RewardTransaction();
        tx.setCitizen(citizen);
        tx.setAmount(points);
        tx.setReason(reason);
        tx.setReferenceId(referenceId);
        rewardTransactionRepository.save(tx);

        log.info("Awarded {} points to user {}. New Level: {}", points, citizen.getId(), citizen.getRewardLevel());
    }
}
