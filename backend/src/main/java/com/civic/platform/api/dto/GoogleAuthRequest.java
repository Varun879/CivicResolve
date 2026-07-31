package com.civic.platform.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleAuthRequest {
    @NotBlank(message = "ID Token is required")
    private String idToken;

    // Role is assigned dynamically or via admin endpoint.

    private String department;
    private String location;
}
