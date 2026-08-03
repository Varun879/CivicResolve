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
        List<com.civic.platform.domain.entities.Complaint> allComplaints = complaintRepository.findAll();
        long total = allComplaints.size();
        long resolved = allComplaints.stream()
                .filter(c -> c.getStatus() == com.civic.platform.domain.enums.ComplaintStatus.RESOLVED)
                .count();

        double avgAiConf = allComplaints.stream()
                .filter(c -> c.getAiConfidenceScore() != null)
                .mapToDouble(c -> c.getAiConfidenceScore().doubleValue())
                .average()
                .orElse(0.0);

        // department performance: Map of department name -> resolution rate
        Map<String, Long> deptTotal = new HashMap<>();
        Map<String, Long> deptResolved = new HashMap<>();
        for (com.civic.platform.domain.entities.Complaint c : allComplaints) {
            String dept = assignmentService.resolveDepartment(c.getCategory());
            if (dept == null) dept = "UNKNOWN";
            deptTotal.put(dept, deptTotal.getOrDefault(dept, 0L) + 1);
            if (c.getStatus() == com.civic.platform.domain.enums.ComplaintStatus.RESOLVED) {
                deptResolved.put(dept, deptResolved.getOrDefault(dept, 0L) + 1);
            }
        }
        
        Map<String, Double> deptPerformance = new HashMap<>();
        for (String dept : deptTotal.keySet()) {
            deptPerformance.put(dept, (double) deptResolved.getOrDefault(dept, 0L) / deptTotal.get(dept) * 100);
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalComplaints", total);
        stats.put("resolvedComplaints", resolved);
        stats.put("resolutionRate", total == 0 ? 0 : (double) resolved / total * 100);
        stats.put("avgAiConfidence", avgAiConf);
        stats.put("departmentPerformance", deptPerformance);
        
        // Add fallback keys
        stats.put("cityWideTotal", total);
        stats.put("cityWideResolved", resolved);
        stats.put("cityHealthScore", total == 0 ? 0 : (double) resolved / total * 100);
        
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
