package com.civic.platform.domain.repositories;

import com.civic.platform.domain.entities.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByCitizenIdOrderByCreatedAtDesc(UUID citizenId);
    
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.citizen.id = :citizenId AND n.isRead = false")
    void markAllAsRead(UUID citizenId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Notification n WHERE n.citizen.id = :citizenId")
    void deleteByCitizenId(UUID citizenId);
}
