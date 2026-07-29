package com.civic.platform.api.controllers;

import com.civic.platform.domain.repositories.ComplaintRepository;
import com.civic.platform.domain.repositories.UserRepository;
import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.services.AssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    private final AssignmentService assignmentService;

    @GetMapping("/depthead")
    @PreAuthorize("hasRole('DEPT_HEAD')")
    public ResponseEntity<Map<String, Object>> getDeptHeadAnalytics(@AuthenticationPrincipal UserDetails userDetails) {
        User deptHead = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        String department = deptHead.getDepartment();
        if (department == null) {
            department = "UNKNOWN";
        }

        String finalDepartment = department;
        List<com.civic.platform.domain.entities.Complaint> deptComplaints = complaintRepository.findAll().stream()
                .filter(c -> finalDepartment.equals(assignmentService.resolveDepartment(c.getCategory())))
                .collect(java.util.stream.Collectors.toList());

        long totalForDept = deptComplaints.size();
        long resolvedForDept = deptComplaints.stream()
                .filter(c -> c.getStatus() == com.civic.platform.domain.enums.ComplaintStatus.RESOLVED)
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("department", department);
        stats.put("totalComplaints", totalForDept);
        stats.put("resolvedComplaints", resolvedForDept);
        stats.put("resolutionRate", totalForDept == 0 ? 0 : (double) resolvedForDept / totalForDept * 100);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/commissioner")
    @PreAuthorize("hasRole('COMMISSIONER')")
    public ResponseEntity<Map<String, Object>> getCommissionerAnalytics() {
        long total = complaintRepository.count();
        long resolved = complaintRepository.countByStatus(com.civic.platform.domain.enums.ComplaintStatus.RESOLVED);

        Map<String, Object> stats = new HashMap<>();
        stats.put("cityWideTotal", total);
        stats.put("cityWideResolved", resolved);
        stats.put("cityHealthScore", total == 0 ? 100 : (double) resolved / total * 100);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getAdminAnalytics() {
        long totalUsers = userRepository.count();
        long totalComplaints = complaintRepository.count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("totalComplaints", totalComplaints);
        stats.put("systemStatus", "HEALTHY");
        
        return ResponseEntity.ok(stats);
    }
}
