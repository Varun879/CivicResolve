package com.civic.platform.api.controllers;

import com.civic.platform.api.dto.ComplaintCreateRequest;
import com.civic.platform.api.dto.ComplaintResponse;
import com.civic.platform.domain.entities.Complaint;
import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.enums.ComplaintStatus;
import com.civic.platform.domain.enums.PriorityBand;
import com.civic.platform.domain.repositories.ComplaintRepository;
import java.math.BigDecimal;
import com.civic.platform.domain.repositories.UserRepository;
import com.civic.platform.domain.services.GeoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.civic.platform.api.dto.StatusUpdateRequest;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/v1/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final GeoService geoService;
    private final com.civic.platform.domain.services.AiInferenceService aiInferenceService;
    private final com.civic.platform.domain.services.AssignmentService assignmentService;
    private final com.civic.platform.domain.services.PriorityEngine priorityEngine;
    private final com.civic.platform.domain.services.SlaEngine slaEngine;
    private final com.civic.platform.domain.services.IdGeneratorService idGeneratorService;
    private final com.civic.platform.domain.services.SLAService slaService;
    private final com.civic.platform.domain.services.SseService sseService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CITIZEN', 'SUPER_ADMIN')")
    public ResponseEntity<ComplaintResponse> createComplaint(
            @Valid @RequestBody ComplaintCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User citizen = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Complaint complaint = new Complaint();
        complaint.setCitizen(citizen);
        complaint.setPublicId(idGeneratorService.generatePublicId());
        complaint.setCategory(request.getCategory());
        complaint.setDescription(request.getDescription());
        complaint.setLatitude(request.getLatitude());
        complaint.setLongitude(request.getLongitude());
        complaint.setImageBase64(request.getImageBase64());
        complaint.setStatus(ComplaintStatus.REPORTED);

        try {
            String url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + request.getLatitude() + "&lon=" + request.getLongitude() + "&zoom=18&addressdetails=1";
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent", "CivicResolve/1.0");
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            org.springframework.http.ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, 
                org.springframework.http.HttpMethod.GET, 
                entity, 
                new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {}
            );
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String displayName = (String) response.getBody().get("display_name");
                complaint.setAddress(displayName);
            }
        } catch (Exception e) {
            System.err.println("Reverse geocoding failed: " + e.getMessage());
        }

        // 1. AI Inference
        var aiResult = aiInferenceService.analyzeImage(request.getImageBase64(), request.getCategory(), request.getDescription(), request.getLatitude(), request.getLongitude());
        complaint.setCategory(aiResult.category);
        complaint.setAiConfidenceScore(aiResult.confidenceScore);
        complaint.setSeverity(aiResult.severity);
        complaint.setEstimatedResolutionHours(aiResult.estimatedResolutionHours);

        // 2. Priority Engine (Bypassed for initial submission, AI provides final priority)
        complaint.setPriorityScore(BigDecimal.ZERO); // Score is no longer strictly calculated initially
        try {
            complaint.setPriorityBand(PriorityBand.valueOf(aiResult.priority));
        } catch (Exception e) {
            complaint.setPriorityBand(PriorityBand.MEDIUM); // Fallback
        }

        // 3. SLA Engine
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now();
        complaint.setCreatedAt(now); // manually set since it's pre-save
        complaint.setSlaDeadline(slaEngine.calculateSlaDeadline(aiResult.category, complaint.getPriorityBand(), false, now));

        // 4. Duplicate Check (GeoService)
        Optional<Complaint> duplicate = geoService.findDuplicate(complaint);
        if (duplicate.isPresent()) {
            Complaint existing = duplicate.get();
            existing.setSupportCount(existing.getSupportCount() + 1);
            
            // Re-calculate priority since support count increased
            var newPriority = priorityEngine.calculatePriority(existing.getSeverity(), existing.getSupportCount(), false, existing.getLatitude(), existing.getLongitude());
            existing.setPriorityScore(newPriority.priorityScore);
            existing.setPriorityBand(newPriority.priorityBand);
            
            complaintRepository.save(existing);
            return ResponseEntity.ok(mapToResponse(existing));
        }

        // 5. Assignment Engine
        String departmentName = assignmentService.resolveDepartment(aiResult.category);
        // Look up closest officer based on location
        Optional<User> assignedOfficer = assignmentService.assignOfficer(departmentName, request.getLatitude(), request.getLongitude());
        assignedOfficer.ifPresent(officer -> {
            complaint.setAssignedOfficerId(officer.getId());
            complaint.setStatus(ComplaintStatus.ASSIGNED);
        });

        Complaint saved = complaintRepository.save(complaint);
        return ResponseEntity.ok(mapToResponse(saved));
    }

    @GetMapping
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<List<ComplaintResponse>> getMyComplaints(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        User citizen = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        List<ComplaintResponse> responses = complaintRepository.findByCitizenId(citizen.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CITIZEN', 'FIELD_OFFICER', 'DEPT_HEAD', 'COMMISSIONER', 'SUPER_ADMIN')")
    public ResponseEntity<ComplaintResponse> getComplaintById(@org.springframework.web.bind.annotation.PathVariable java.util.UUID id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        return ResponseEntity.ok(mapToResponse(complaint));
    }

    @GetMapping("/nearby")
    @PreAuthorize("hasAnyRole('CITIZEN', 'FIELD_OFFICER', 'DEPT_HEAD', 'COMMISSIONER', 'SUPER_ADMIN')")
    public ResponseEntity<List<ComplaintResponse>> getNearbyComplaints(
            @org.springframework.web.bind.annotation.RequestParam Double lat,
            @org.springframework.web.bind.annotation.RequestParam Double lng,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "5.0") Double radiusKm) {
        List<ComplaintResponse> responses = complaintRepository.findAll().stream()
                .filter(c -> c.getLatitude() != null && c.getLongitude() != null)
                .filter(c -> assignmentService.calculateHaversine(lat, lng, c.getLatitude().doubleValue(), c.getLongitude().doubleValue()) <= radiusKm)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    private final com.civic.platform.domain.services.RewardService rewardService;

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<ComplaintResponse> verifyResolution(
            @PathVariable java.util.UUID id,
            @RequestBody StatusUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        if (!complaint.getCitizen().getEmail().equals(userDetails.getUsername())) {
            throw new RuntimeException("Not authorized to verify this complaint");
        }

        ComplaintStatus status = request.getStatus();

        if (complaint.getStatus() == ComplaintStatus.RESOLVED && (status == ComplaintStatus.CLOSED || status == ComplaintStatus.REOPENED)) {
            complaint.setStatus(status);
            
            if (status == ComplaintStatus.CLOSED) {
                // If CLOSED, allocate reward points to citizen
                rewardService.allocatePoints(complaint.getCitizen(), 20, "Community Verified (Issue Fixed)", complaint.getId());
            } else if (status == ComplaintStatus.REOPENED) {
                // Increment reopenCount if not already reopened in this cycle
                complaint.setReopenCount(complaint.getReopenCount() + 1);
                // The reason is passed in request.getReason(), we can log it or save to a Comment (we will implement comments later)
            }
        } else {
            throw new RuntimeException("Invalid state transition from " + complaint.getStatus() + " to " + status);
        }

        complaintRepository.save(complaint);
        sseService.emitComplaintUpdate(complaint.getId());
        return ResponseEntity.ok(mapToResponse(complaint));
    }

    @GetMapping("/depthead")
    @PreAuthorize("hasRole('DEPT_HEAD')")
    public ResponseEntity<List<ComplaintResponse>> getDeptHeadComplaints(@AuthenticationPrincipal UserDetails userDetails) {
        User deptHead = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        String department = deptHead.getDepartment();
        if (department == null) {
            department = "UNKNOWN";
        }

        String finalDepartment = department;
        List<ComplaintResponse> responses = complaintRepository.findAll().stream()
                .filter(c -> finalDepartment.equals(assignmentService.resolveDepartment(c.getCategory())))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/commissioner")
    @PreAuthorize("hasRole('COMMISSIONER')")
    public ResponseEntity<List<ComplaintResponse>> getCommissionerComplaints() {
        List<ComplaintResponse> responses = complaintRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{id}/escalate")
    @PreAuthorize("hasAnyRole('CITIZEN', 'FIELD_OFFICER', 'DEPT_HEAD', 'COMMISSIONER', 'SUPER_ADMIN')")
    public ResponseEntity<ComplaintResponse> manualEscalate(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        
        User caller = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isCreator = caller.getId().equals(complaint.getCitizen().getId());
        boolean isAssignedOfficer = complaint.getAssignedOfficerId() != null && caller.getId().equals(complaint.getAssignedOfficerId());
        boolean isDeptHeadOrAbove = caller.getRole() == com.civic.platform.domain.enums.Role.DEPT_HEAD || 
                                    caller.getRole() == com.civic.platform.domain.enums.Role.COMMISSIONER || 
                                    caller.getRole() == com.civic.platform.domain.enums.Role.SUPER_ADMIN;

        if (!isCreator && !isAssignedOfficer && !isDeptHeadOrAbove) {
             throw new org.springframework.security.access.AccessDeniedException("Not authorized to escalate this complaint");
        }

        complaint.setSlaDeadline(java.time.ZonedDateTime.now().minusHours(1));
        complaintRepository.save(complaint);
        sseService.emitComplaintUpdate(complaint.getId());
        slaService.escalateTo(complaint, "MUNICIPAL_COMMISSIONER", 100.0);
        
        return ResponseEntity.ok(mapToResponse(complaint));
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getComplaintImage(@PathVariable java.util.UUID id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        
        if (complaint.getImageBase64() == null) {
            return ResponseEntity.notFound().build();
        }

        String base64Data = complaint.getImageBase64();
        // Remove data URI scheme prefix if present
        if (base64Data.contains(",")) {
            base64Data = base64Data.split(",")[1];
        }

        byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.IMAGE_JPEG);
        return new ResponseEntity<>(imageBytes, headers, org.springframework.http.HttpStatus.OK);
    }

    @PostMapping("/{id}/upvote")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<ComplaintResponse> upvoteComplaint(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        
        User citizen = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        com.civic.platform.domain.repositories.VoteRepository voteRepo = org.springframework.web.context.support.WebApplicationContextUtils.getRequiredWebApplicationContext(((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.currentRequestAttributes()).getRequest().getServletContext()).getBean(com.civic.platform.domain.repositories.VoteRepository.class);

        if (voteRepo.existsByComplaintIdAndCitizenId(id, citizen.getId())) {
            throw new RuntimeException("Already voted");
        }

        com.civic.platform.domain.entities.Vote vote = new com.civic.platform.domain.entities.Vote();
        vote.setComplaint(complaint);
        vote.setCitizen(citizen);
        voteRepo.save(vote);

        complaint.setSupportCount(complaint.getSupportCount() + 1);
        complaintRepository.save(complaint);
        sseService.emitComplaintUpdate(complaint.getId());

        return ResponseEntity.ok(mapToResponse(complaint));
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('CITIZEN', 'FIELD_OFFICER', 'DEPT_HEAD', 'COMMISSIONER', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> addComment(
            @PathVariable java.util.UUID id,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        
        User author = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        com.civic.platform.domain.repositories.CommentRepository commentRepo = org.springframework.web.context.support.WebApplicationContextUtils.getRequiredWebApplicationContext(((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.currentRequestAttributes()).getRequest().getServletContext()).getBean(com.civic.platform.domain.repositories.CommentRepository.class);

        com.civic.platform.domain.entities.Comment comment = new com.civic.platform.domain.entities.Comment();
        comment.setComplaint(complaint);
        comment.setAuthor(author);
        comment.setContent(request.get("content"));
        commentRepo.save(comment);
        
        sseService.emitComplaintUpdate(complaint.getId());

        Map<String, Object> map = new HashMap<>();
        map.put("id", comment.getId());
        map.put("content", comment.getContent());
        map.put("authorName", author.getName() != null ? author.getName() : "User");
        map.put("createdAt", comment.getCreatedAt());

        return ResponseEntity.ok(map);
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('CITIZEN', 'FIELD_OFFICER', 'DEPT_HEAD', 'COMMISSIONER', 'SUPER_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getComments(@PathVariable java.util.UUID id) {
        com.civic.platform.domain.repositories.CommentRepository commentRepo = org.springframework.web.context.support.WebApplicationContextUtils.getRequiredWebApplicationContext(((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.currentRequestAttributes()).getRequest().getServletContext()).getBean(com.civic.platform.domain.repositories.CommentRepository.class);
        
        List<Map<String, Object>> responses = commentRepo.findByComplaintIdOrderByCreatedAtDesc(id).stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("content", c.getContent());
            map.put("authorName", c.getAuthor().getName() != null ? c.getAuthor().getName() : "User");
            map.put("createdAt", c.getCreatedAt());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}/resolution-image")
    public ResponseEntity<byte[]> getResolutionImage(@PathVariable java.util.UUID id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        if (complaint.getResolutionImageBase64() == null) {
            return ResponseEntity.notFound().build();
        }

        String base64Data = complaint.getResolutionImageBase64();
        if (base64Data.contains(",")) {
            base64Data = base64Data.split(",")[1];
        }

        byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.IMAGE_JPEG);
        return new ResponseEntity<>(imageBytes, headers, org.springframework.http.HttpStatus.OK);
    }

    private ComplaintResponse mapToResponse(Complaint c) {
        if (c.getSlaDeadline() != null && java.time.ZonedDateTime.now().isAfter(c.getSlaDeadline()) && c.getStatus() != ComplaintStatus.RESOLVED && c.getStatus() != ComplaintStatus.CLOSED && c.getStatus() != ComplaintStatus.REJECTED) {
            if (c.getIsEscalated() == null || !c.getIsEscalated()) {
                try {
                    slaService.escalateTo(c, "MUNICIPAL_COMMISSIONER", 100.0);
                } catch (Exception ignored) {}
            }
        }

        String offName = null, offPhone = null, offDept = null;
        Double distKm = null;
        if (c.getAssignedOfficerId() != null) {
            var officerOpt = userRepository.findById(c.getAssignedOfficerId());
            if (officerOpt.isPresent()) {
                User off = officerOpt.get();
                offName = off.getName();
                offPhone = off.getPhone();
                offDept = off.getDepartment();
                if (off.getLocation() != null && !off.getLocation().isEmpty() && c.getLatitude() != null && c.getLongitude() != null) {
                    try {
                        String[] parts = off.getLocation().split(",");
                        if (parts.length == 2) {
                            double offLat = Double.parseDouble(parts[0].trim());
                            double offLng = Double.parseDouble(parts[1].trim());
                            distKm = assignmentService.calculateHaversine(c.getLatitude().doubleValue(), c.getLongitude().doubleValue(), offLat, offLng);
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        String supName = null, supRole = null;
        if (c.getSuperiorOfficerId() != null) {
            var supOpt = userRepository.findById(c.getSuperiorOfficerId());
            if (supOpt.isPresent()) {
                supName = supOpt.get().getName();
                supRole = supOpt.get().getRole() != null ? supOpt.get().getRole().name() : "SUPERIOR";
            }
        }

        return ComplaintResponse.builder()
                .id(c.getId())
                .publicId(c.getPublicId())
                .category(c.getCategory())
                .description(c.getDescription())
                .status(c.getStatus())
                .severity(c.getSeverity())
                .priorityBand(c.getPriorityBand() != null ? c.getPriorityBand().name() : null)
                .latitude(c.getLatitude())
                .longitude(c.getLongitude())
                .address(c.getAddress())
                .department(assignmentService.resolveDepartment(c.getCategory()))
                .supportCount(c.getSupportCount())
                .createdAt(c.getCreatedAt())
                .slaDeadline(c.getSlaDeadline())
                .reopenCount(c.getReopenCount())
                .aiConfidenceScore(c.getAiConfidenceScore())
                .imageUrl(c.getImageBase64() != null ? "/api/v1/complaints/" + c.getId() + "/image" : null)
                .assignedOfficerId(c.getAssignedOfficerId())
                .assignedOfficerName(offName)
                .assignedOfficerPhone(offPhone)
                .assignedOfficerDepartment(offDept)
                .distanceToOfficerKm(distKm)
                .resolutionImageUrl(c.getResolutionImageBase64() != null ? "/api/v1/complaints/" + c.getId() + "/resolution-image" : null)
                .resolutionLatitude(c.getResolutionLatitude())
                .resolutionLongitude(c.getResolutionLongitude())
                .isEscalated(c.getIsEscalated())
                .superiorOfficerName(supName)
                .superiorOfficerRole(supRole)
                .build();
    }
}
