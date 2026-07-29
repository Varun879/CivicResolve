package com.civic.platform.api.controllers;

import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final UserRepository userRepository;
    private final com.civic.platform.domain.repositories.ComplaintRepository complaintRepository;
    private final com.civic.platform.domain.services.AssignmentService assignmentService;

    @org.springframework.beans.factory.annotation.Value("${rewards.top-contributor-percentile:10}")
    private int topContributorPercentile;

    @GetMapping("/me")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<Map<String, Object>> getMyRewards(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        long totalCitizens = userRepository.countByRole(com.civic.platform.domain.enums.Role.CITIZEN);
        long rank = userRepository.countByPointsGreaterThan(user.getPoints()) + 1;
        
        double percentile = totalCitizens > 0 ? ((double) (totalCitizens - rank) / totalCitizens) * 100 : 100;
        boolean isTopContributor = percentile >= (100 - topContributorPercentile);
        
        String formattedTier = formatTier(user.getRewardLevel());

        Map<String, Object> response = new HashMap<>();
        response.put("points", user.getPoints());
        response.put("tier", formattedTier);
        response.put("pointsToNextTier", getPointsToNextTier(user.getPoints()));
        response.put("nextTier", getNextTier(user.getPoints()));
        response.put("isTopContributor", isTopContributor);
        response.put("rank", rank);

        return ResponseEntity.ok(response);
    }

    private String formatTier(String tier) {
        if (tier == null) return "Bronze";
        return switch (tier) {
            case "CITY_GUARDIAN" -> "City Guardian";
            case "DIAMOND" -> "Diamond";
            case "GOLD" -> "Gold";
            case "SILVER" -> "Silver";
            default -> "Bronze";
        };
    }

    private int getPointsToNextTier(int points) {
        if (points < 100) return 100 - points;
        if (points < 300) return 300 - points;
        if (points < 700) return 700 - points;
        if (points < 1500) return 1500 - points;
        return 0;
    }

    private String getNextTier(int points) {
        if (points < 100) return "Silver";
        if (points < 300) return "Gold";
        if (points < 700) return "Diamond";
        if (points < 1500) return "City Guardian";
        return "Max Tier";
    }

    @GetMapping("/leaderboard")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<java.util.List<Map<String, Object>>> getLeaderboard(
            @org.springframework.web.bind.annotation.RequestParam(required = false) Double lat,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Double lng) {
        java.util.List<User> allCitizens = userRepository.findAll().stream()
                .filter(u -> u.getRole() == com.civic.platform.domain.enums.Role.CITIZEN)
                .filter(u -> u.getEmail() == null || (!u.getEmail().endsWith("@example.com") && !u.getEmail().toLowerCase().contains("test") && !u.getEmail().toLowerCase().contains("dummy") && !u.getEmail().toLowerCase().contains("mock") && !u.getEmail().toLowerCase().contains("fake")))
                .filter(u -> u.getName() == null || (!u.getName().toLowerCase().contains("test") && !u.getName().toLowerCase().contains("dummy") && !u.getName().toLowerCase().contains("mock") && !u.getName().toLowerCase().contains("fake")))
                .filter(u -> {
                    if (lat == null || lng == null) return true;
                    java.util.List<com.civic.platform.domain.entities.Complaint> userComplaints = complaintRepository.findByCitizenId(u.getId());
                    if (userComplaints.isEmpty()) return true;
                    for (com.civic.platform.domain.entities.Complaint c : userComplaints) {
                        if (c.getLatitude() != null && c.getLongitude() != null) {
                            double dist = assignmentService.calculateHaversine(lat, lng, c.getLatitude().doubleValue(), c.getLongitude().doubleValue());
                            if (dist <= 5.0) return true;
                        }
                    }
                    return false;
                })
                .sorted((a, b) -> Integer.compare(b.getPoints(), a.getPoints()))
                .limit(20)
                .collect(java.util.stream.Collectors.toList());
        
        java.util.List<Map<String, Object>> response = allCitizens.stream().map(u -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("name", u.getName() != null ? u.getName() : "Citizen");
            map.put("email", u.getEmail());
            map.put("points", u.getPoints());
            map.put("tier", formatTier(u.getRewardLevel()));
            map.put("issuesReported", complaintRepository.countByCitizenId(u.getId()));
            map.put("issuesResolved", complaintRepository.countByCitizenIdAndStatus(u.getId(), com.civic.platform.domain.enums.ComplaintStatus.RESOLVED));
            return map;
        }).collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(response);
    }
}
