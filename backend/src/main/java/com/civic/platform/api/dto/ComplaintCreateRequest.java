package com.civic.platform.api.dto;

import com.civic.platform.domain.enums.Category;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ComplaintCreateRequest {
    @NotNull(message = "Category is required")
    private Category category;
    
    private String description;
    
    @NotNull(message = "Latitude is required")
    private BigDecimal latitude;
    
    @NotNull(message = "Longitude is required")
    private BigDecimal longitude;

    private String imageBase64;
}
