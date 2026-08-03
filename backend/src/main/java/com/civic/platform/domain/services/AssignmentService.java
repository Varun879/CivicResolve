package com.civic.platform.domain.services;

import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.enums.Category;
import com.civic.platform.domain.enums.Role;
import com.civic.platform.domain.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final UserRepository userRepository;

    public String resolveDepartment(Category category) {
        if (category == null) return "GENERAL";
        
        switch (category) {
            case POTHOLE:
            case DAMAGED_ROAD:
            case FOOTPATH_DAMAGE:
            case STREETLIGHT:
            case TRAFFIC_SIGNAL:
                return "TRANSPORT_AND_ROADS";
            case GARBAGE:
            case ILLEGAL_DUMPING:
            case OVERFLOWING_DUSTBIN:
            case ANIMAL_CARCASS:
                return "SANITATION";
            case DRAINAGE_BLOCKAGE:
            case WATER_LOGGING:
            case SEWAGE_OVERFLOW:
            case WATER_LEAKAGE:
            case OPEN_MANHOLE:
                return "WATER_AND_SEWAGE";
            case PUBLIC_PROPERTY_DAMAGE:
            case FALLEN_TREE:
            case PARK_MAINTENANCE:
                return "PARKS_AND_PUBLIC_WORKS";
            case OTHER:
            default:
                return "GENERAL";
        }
    }

    public Optional<User> assignOfficer(String departmentName, java.math.BigDecimal lat, java.math.BigDecimal lng) {
        List<User> officers = userRepository.findByRoleAndDepartment(Role.FIELD_OFFICER, departmentName);
        if (officers == null || officers.isEmpty()) {
            // Fallback: If no officer exists in that specific department, assign to any available FIELD_OFFICER
            officers = userRepository.findByRole(Role.FIELD_OFFICER);
        }
        if (officers != null && !officers.isEmpty() && lat != null && lng != null) {
            User closestOfficer = null;
            double minDistance = Double.MAX_VALUE;

            for (User officer : officers) {
                if (officer.getLocation() != null && !officer.getLocation().isEmpty()) {
                    try {
                        String[] parts = officer.getLocation().split(",");
                        if (parts.length == 2) {
                            double offLat = Double.parseDouble(parts[0].trim());
                            double offLng = Double.parseDouble(parts[1].trim());
                            double dist = calculateHaversine(lat.doubleValue(), lng.doubleValue(), offLat, offLng);
                            if (dist < minDistance) {
                                minDistance = dist;
                                closestOfficer = officer;
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("Error parsing location for officer: " + officer.getEmail());
                    }
                }
            }

            if (closestOfficer != null) {
                return Optional.of(closestOfficer);
            }
            
            // Fallback to random if no valid locations found
            int index = (int) (Math.random() * officers.size());
            return Optional.of(officers.get(index));
        } else if (officers != null && !officers.isEmpty()) {
            int index = (int) (Math.random() * officers.size());
            return Optional.of(officers.get(index));
        }
        return Optional.empty();
    }

    public Optional<User> findSuperiorOfficer(String departmentName, java.math.BigDecimal lat, java.math.BigDecimal lng, String level) {
        Role targetRole = Role.DEPT_HEAD;
        if ("ASSISTANT_ENGINEER".equals(level)) targetRole = Role.ASST_ENGINEER;
        else if ("EXECUTIVE_ENGINEER".equals(level)) targetRole = Role.EXEC_ENGINEER;
        else if ("MUNICIPAL_COMMISSIONER".equals(level)) targetRole = Role.COMMISSIONER;
        
        List<User> superiors = userRepository.findByRoleAndDepartment(targetRole, departmentName);
        if (superiors != null && !superiors.isEmpty()) {
            return Optional.of(superiors.get(0));
        }
        
        // Fallback to commissioner if no specific role found
        if (targetRole != Role.COMMISSIONER) {
            List<User> commissioners = userRepository.findByRole(Role.COMMISSIONER);
            if (commissioners != null && !commissioners.isEmpty()) {
                return Optional.of(commissioners.get(0));
            }
        }
        return Optional.empty();
    }

    public double calculateHaversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
