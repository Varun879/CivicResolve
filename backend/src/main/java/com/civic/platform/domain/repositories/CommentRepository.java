package com.civic.platform.domain.repositories;

import com.civic.platform.domain.entities.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {
    List<Comment> findByComplaintIdOrderByCreatedAtDesc(UUID complaintId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Comment c WHERE c.author.id = :authorId")
    void deleteByAuthorId(@Param("authorId") UUID authorId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Comment c WHERE c.complaint.id = :complaintId")
    void deleteByComplaintId(@Param("complaintId") UUID complaintId);
}
