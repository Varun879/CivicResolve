package com.civic.platform.api.dto;

import com.civic.platform.domain.enums.Role;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleAuthRequest {
    @NotBlank(message = "ID Token is required")
    private String idToken;

    // Optional: Provided if it's a new user and they just selected a role
    private Role role;

    private String department;
    private String location;
}
