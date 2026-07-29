package com.civic.platform.domain.services;

import com.civic.platform.domain.enums.Category;
import com.civic.platform.domain.enums.PriorityBand;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;

@Service
public class SlaEngine {

    public ZonedDateTime calculateSlaDeadline(Category category, PriorityBand priorityBand, boolean emergencyFlag, ZonedDateTime createdAt) {
        if (createdAt == null) {
            createdAt = ZonedDateTime.now();
        }
        if (emergencyFlag || priorityBand == PriorityBand.CRITICAL) {
            return createdAt.plusHours(24); // 1 day
        }
        if (priorityBand == PriorityBand.HIGH) {
            return createdAt.plusHours(48); // 2 days
        }
        if (priorityBand == PriorityBand.MEDIUM) {
            return createdAt.plusHours(96); // 4 days
        }
        if (priorityBand == PriorityBand.LOW) {
            return createdAt.plusHours(168); // 7 days
        }
        return calculateSlaDeadline(category, emergencyFlag, createdAt);
    }

    public ZonedDateTime calculateSlaDeadline(Category category, boolean emergencyFlag, ZonedDateTime createdAt) {
        if (createdAt == null) {
            createdAt = ZonedDateTime.now();
        }

        if (emergencyFlag) {
            return createdAt.plusHours(2);
        }

        if (category == null) {
            return createdAt.plusHours(96); // default 4 days
        }

        switch (category) {
            case FALLEN_TREE:
            case OPEN_MANHOLE:
                return createdAt.plusHours(6);
                
            case SEWAGE_OVERFLOW:
                return createdAt.plusHours(12);
                
            case GARBAGE:
            case OVERFLOWING_DUSTBIN:
            case ANIMAL_CARCASS:
            case ILLEGAL_DUMPING:
                return createdAt.plusHours(24);
                
            case STREETLIGHT:
            case TRAFFIC_SIGNAL:
                return createdAt.plusHours(48);
                
            case DRAINAGE_BLOCKAGE:
            case WATER_LOGGING:
            case WATER_LEAKAGE:
                return createdAt.plusHours(72);
                
            case POTHOLE:
            case DAMAGED_ROAD:
            case FOOTPATH_DAMAGE:
            case PUBLIC_PROPERTY_DAMAGE:
            case PARK_MAINTENANCE:
            case OTHER:
            default:
                return createdAt.plusHours(96);
        }
    }
}
