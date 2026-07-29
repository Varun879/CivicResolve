package com.civic.platform.domain.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "escalation")
@Getter
@Setter
public class Escalation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    @Column(nullable = false)
    private String level;

    @Column(name = "triggered_at", nullable = false)
    private ZonedDateTime triggeredAt = ZonedDateTime.now();

    @Column
    private String reason;
}
