package com.civic.platform.api.dto;

import com.civic.platform.domain.enums.Category;
import com.civic.platform.domain.enums.ComplaintStatus;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
public class ComplaintResponse {
    private UUID id;
    private Category category;
    private String description;
    private ComplaintStatus status;
    private String severity;
    private String priorityBand;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Integer supportCount;
    private ZonedDateTime createdAt;
    private BigDecimal aiConfidenceScore;
    private String imageUrl;
    private String publicId;
    private ZonedDateTime slaDeadline;
    private Integer reopenCount;

    // Assigned Officer Tracking
    private UUID assignedOfficerId;
    private String assignedOfficerName;
    private String assignedOfficerPhone;
    private String assignedOfficerDepartment;
    private Double distanceToOfficerKm;

    // Resolution Verification
    private String resolutionImageUrl;
    private BigDecimal resolutionLatitude;
    private BigDecimal resolutionLongitude;

    // Escalation Tracking
    private Boolean isEscalated;
    private String superiorOfficerName;
    private String superiorOfficerRole;
}
