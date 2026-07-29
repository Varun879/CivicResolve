package com.civic.platform.domain.repositories;

import com.civic.platform.domain.entities.Vote;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

public interface VoteRepository extends JpaRepository<Vote, UUID> {
    boolean existsByComplaintIdAndCitizenId(UUID complaintId, UUID citizenId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Vote v WHERE v.citizen.id = :citizenId")
    void deleteByCitizenId(@Param("citizenId") UUID citizenId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Vote v WHERE v.complaint.id = :complaintId")
    void deleteByComplaintId(@Param("complaintId") UUID complaintId);
}
