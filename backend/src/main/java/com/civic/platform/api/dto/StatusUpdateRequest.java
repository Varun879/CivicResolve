package com.civic.platform.api.dto;

import com.civic.platform.domain.enums.ComplaintStatus;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class StatusUpdateRequest {
    private ComplaintStatus status;
    private Integer rating;
    private String reason;
    private String resolutionImageBase64;
    private BigDecimal resolutionLatitude;
    private BigDecimal resolutionLongitude;
}
