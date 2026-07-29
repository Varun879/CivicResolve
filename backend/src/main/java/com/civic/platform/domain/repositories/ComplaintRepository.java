package com.civic.platform.domain.repositories;

import com.civic.platform.domain.entities.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

public interface ComplaintRepository extends JpaRepository<Complaint, UUID> {

    // PostGIS Native Query: Find duplicates within 50m of a given point, matching category, created within last 72h
    @Query(value = "SELECT * FROM complaint c WHERE " +
           "c.category = :category AND " +
           "c.created_at >= :since AND " +
           "ST_DWithin(c.geom, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326), 50)", nativeQuery = true)
    List<Complaint> findPotentialDuplicates(
            @Param("category") String category, 
            @Param("since") ZonedDateTime since, 
            @Param("latitude") double latitude, 
            @Param("longitude") double longitude);

    // SLA Monitoring Query: Find unresolved complaints where SLA deadline is past
    @Query("SELECT c FROM Complaint c WHERE c.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED') AND c.slaDeadline < :now")
    List<Complaint> findBreachedComplaints(@Param("now") ZonedDateTime now);

    List<Complaint> findByCitizenId(UUID citizenId);
    List<Complaint> findByAssignedOfficerId(UUID officerId);
    List<Complaint> findByCategory(String category);
    long countByStatus(com.civic.platform.domain.enums.ComplaintStatus status);
    
    @Query("SELECT count(c) FROM Complaint c WHERE c.category = :category AND c.status = :status")
    long countByCategoryAndStatus(@Param("category") String category, @Param("status") com.civic.platform.domain.enums.ComplaintStatus status);

    long countByCitizenId(UUID citizenId);
    long countByCitizenIdAndStatus(UUID citizenId, com.civic.platform.domain.enums.ComplaintStatus status);
}
