package com.civic.platform.api.controllers;

import com.civic.platform.api.dto.ComplaintResponse;
import com.civic.platform.domain.entities.Complaint;
import com.civic.platform.domain.enums.ComplaintStatus;
import com.civic.platform.domain.repositories.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.civic.platform.api.dto.StatusUpdateRequest;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import com.civic.platform.domain.repositories.UserRepository;

@RestController
@RequestMapping("/api/v1/officer")
@RequiredArgsConstructor
public class OfficerController {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final com.civic.platform.domain.repositories.NotificationRepository notificationRepository;
    private final com.civic.platform.domain.services.AssignmentService assignmentService;
    private final com.civic.platform.domain.services.SseService sseService;

    @GetMapping("/assignments")
    @PreAuthorize("hasRole('FIELD_OFFICER')")
    public ResponseEntity<List<ComplaintResponse>> getMyAssignments(@AuthenticationPrincipal UserDetails userDetails) {
        com.civic.platform.domain.entities.User officer = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ComplaintResponse> responses = complaintRepository.findAll().stream()
                .filter(c -> officer.getId().equals(c.getAssignedOfficerId()) || c.getAssignedOfficerId() == null)
                .filter(c -> c.getStatus() != ComplaintStatus.CLOSED && c.getStatus() != ComplaintStatus.REJECTED)
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @PatchMapping("/complaints/{id}/status")
    @PreAuthorize("hasRole('FIELD_OFFICER')")
    public ResponseEntity<ComplaintResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody StatusUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        com.civic.platform.domain.entities.User officer = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        ComplaintStatus status = request.getStatus();

        if (complaint.getAssignedOfficerId() == null || status == ComplaintStatus.ACCEPTED) {
            complaint.setAssignedOfficerId(officer.getId());
        }

        if (status == ComplaintStatus.RESOLVED) {
            if (request.getResolutionImageBase64() == null || request.getResolutionImageBase64().trim().isEmpty()) {
                throw new RuntimeException("❌ Photo Verification Failed: You must upload a resolution photo showing the fixed civic issue on-site.");
            }
            if (request.getResolutionLatitude() == null || request.getResolutionLongitude() == null) {
                throw new RuntimeException("❌ Location Verification Failed: Real-time GPS coordinates are required to verify on-site resolution.");
            }
            if (complaint.getLatitude() != null && complaint.getLongitude() != null) {
                double dist = assignmentService.calculateHaversine(
                        complaint.getLatitude().doubleValue(), complaint.getLongitude().doubleValue(),
                        request.getResolutionLatitude().doubleValue(), request.getResolutionLongitude().doubleValue()
                );
                if (dist > 0.01) {
                    throw new RuntimeException("❌ Location Verification Failed: Resolving location coordinates must match within 10 meters of the reported issue location. Your distance deviation: " + (int)(dist * 1000) + " meters (Max allowed: 10 meters). You must be on-site at the exact location to submit a resolution photo.");
                }
            }
            complaint.setResolutionImageBase64(request.getResolutionImageBase64());
            complaint.setResolutionLatitude(request.getResolutionLatitude());
            complaint.setResolutionLongitude(request.getResolutionLongitude());
            complaint.setResolvedAt(java.time.ZonedDateTime.now());
        }

        // Allow progressing directly to valid active states without rigid step-by-step enforcement
        if (status == ComplaintStatus.ACCEPTED || status == ComplaintStatus.WORK_STARTED || status == ComplaintStatus.UNDER_INSPECTION || status == ComplaintStatus.RESOLVED) {
            complaint.setStatus(status);
        } else {
            throw new RuntimeException("Invalid state transition from " + complaint.getStatus() + " to " + status);
        }

        complaintRepository.save(complaint);

        // Notify Citizen if present
        if (complaint.getCitizen() != null) {
            com.civic.platform.domain.entities.Notification notif = new com.civic.platform.domain.entities.Notification();
            notif.setCitizen(complaint.getCitizen());
            notif.setReferenceId(complaint.getId());
            if (status == ComplaintStatus.WORK_STARTED) {
                notif.setTitle("Work Started");
                notif.setMessage("An officer has started working on your report for " + complaint.getCategory());
            } else if (status == ComplaintStatus.RESOLVED) {
                notif.setTitle("Issue Resolved");
                notif.setMessage("Your report for " + complaint.getCategory() + " has been verified and resolved on-site! Please review it.");
            } else {
                notif.setTitle("Status Update");
                notif.setMessage("Your report for " + complaint.getCategory() + " is now " + status);
            }
            notificationRepository.save(notif);
        }

        // Emit SSE update to listening clients
        sseService.emitComplaintUpdate(complaint.getId());

        return ResponseEntity.ok(mapToResponse(complaint));
    }

    private ComplaintResponse mapToResponse(Complaint c) {
        String offName = null, offPhone = null, offDept = null;
        Double distKm = null;
        if (c.getAssignedOfficerId() != null) {
            var officerOpt = userRepository.findById(c.getAssignedOfficerId());
            if (officerOpt.isPresent()) {
                com.civic.platform.domain.entities.User off = officerOpt.get();
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
                .category(c.getCategory())
                .description(c.getDescription())
                .status(c.getStatus())
                .severity(c.getSeverity())
                .priorityBand(c.getPriorityBand() != null ? c.getPriorityBand().name() : null)
                .latitude(c.getLatitude())
                .longitude(c.getLongitude())
                .supportCount(c.getSupportCount())
                .createdAt(c.getCreatedAt())
                .slaDeadline(c.getSlaDeadline())
                .reopenCount(c.getReopenCount())
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
