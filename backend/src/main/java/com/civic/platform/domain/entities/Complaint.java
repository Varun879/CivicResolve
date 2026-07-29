package com.civic.platform.domain.entities;

import com.civic.platform.domain.enums.Category;
import com.civic.platform.domain.enums.ComplaintStatus;
import com.civic.platform.domain.enums.PriorityBand;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.locationtech.jts.geom.Point;
import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "complaint")
@Getter
@Setter
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "citizen_id", nullable = false)
    private User citizen;

    @Enumerated(EnumType.STRING)
    private Category category;

    private String description;

    @Column(name = "severity")
    private String severity;

    @Column(name = "priority_score", precision = 5, scale = 4)
    private BigDecimal priorityScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority_band")
    private PriorityBand priorityBand;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplaintStatus status = ComplaintStatus.REPORTED;

    @Column(nullable = false, precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 9, scale = 6)
    private BigDecimal longitude;

    // PostGIS Geometry Point
    @Column(columnDefinition = "geometry(Point,4326)")
    private Point geom;

    @Column(name = "ward_id")
    private UUID wardId;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "assigned_officer_id")
    private UUID assignedOfficerId;

    @Column(name = "ai_confidence_score", precision = 5, scale = 4)
    private BigDecimal aiConfidenceScore;

    @Column(name = "estimated_resolution_hours")
    private Integer estimatedResolutionHours;

    @Column(name = "sla_deadline")
    private ZonedDateTime slaDeadline;

    @Column(name = "support_count")
    private Integer supportCount = 1;

    @Column(name = "duplicate_of_id")
    private UUID duplicateOfId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "resolved_at")
    private ZonedDateTime resolvedAt;

    @Column(name = "closed_at")
    private ZonedDateTime closedAt;

    @Column(name = "public_id")
    private String publicId;

    @Column(name = "reopen_count")
    private Integer reopenCount = 0;

    @Column(name = "image_base64", columnDefinition = "TEXT")
    private String imageBase64;

    @Column(name = "resolution_image_base64", columnDefinition = "TEXT")
    private String resolutionImageBase64;

    @Column(name = "resolution_latitude", precision = 9, scale = 6)
    private BigDecimal resolutionLatitude;

    @Column(name = "resolution_longitude", precision = 9, scale = 6)
    private BigDecimal resolutionLongitude;

    @Column(name = "is_escalated")
    private Boolean isEscalated = false;

    @Column(name = "superior_officer_id")
    private UUID superiorOfficerId;
}
