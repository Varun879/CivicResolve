package com.civic.platform.api.controllers;

import com.civic.platform.api.dto.ComplaintCreateRequest;
import com.civic.platform.domain.services.AiInferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiInferenceService aiInferenceService;

    @PostMapping("/analyze")
    @PreAuthorize("hasAnyRole('CITIZEN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> analyzeImage(@RequestBody ComplaintCreateRequest request) {
        var aiResult = aiInferenceService.analyzeImage(request.getImageBase64(), request.getCategory(), request.getDescription(), request.getLatitude(), request.getLongitude());
        
        Map<String, Object> response = new HashMap<>();
        response.put("category", aiResult.category.name());
        response.put("priority", aiResult.priority);
        response.put("severity", aiResult.severity);
        response.put("justification", aiResult.justification);
        response.put("notes", aiResult.notes);
        response.put("confidence", aiResult.confidenceScore);
        
        return ResponseEntity.ok(response);
    }
}
