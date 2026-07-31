package com.civic.platform.api.controllers;

import com.civic.platform.domain.services.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sse")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.allowed-origins:http://localhost:5173}")
public class SseController {

    private final SseService sseService;

    @GetMapping(path = "/subscribe/{complaintId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public SseEmitter subscribe(@PathVariable UUID complaintId) {
        return sseService.subscribeToComplaint(complaintId);
    }
}
