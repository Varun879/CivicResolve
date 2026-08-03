package com.civic.platform.domain.services;

import com.civic.platform.domain.enums.PriorityBand;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PriorityEngine {

    public static class PriorityResult {
        public BigDecimal priorityScore;
        public PriorityBand priorityBand;
    }

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PriorityResult calculatePriority(String severity, int supportCount, boolean emergencyFlag, BigDecimal latitude, BigDecimal longitude) {
        PriorityResult result = new PriorityResult();

        if (emergencyFlag) {
            result.priorityScore = BigDecimal.ONE;
            result.priorityBand = PriorityBand.CRITICAL;
            return result;
        }

        // Normalize Severity (0 to 1)
        double severityScore;
        switch (severity) {
            case "CRITICAL": severityScore = 1.0; break;
            case "HIGH": severityScore = 0.75; break;
            case "MEDIUM": severityScore = 0.50; break;
            case "LOW": severityScore = 0.25; break;
            default: severityScore = 0.0; break;
        }

        double schoolProximity = 0.0;
        double hospitalProximity = 0.0;

        // Query Overpass API for location context
        if (latitude != null && longitude != null) {
            try {
                String overpassQuery = String.format("[out:json];(node[\"amenity\"~\"school\"](around:500,%f,%f);way[\"amenity\"~\"school\"](around:500,%f,%f););out center;", 
                    latitude, longitude, latitude, longitude);
                String overpassUrl = "https://overpass-api.de/api/interpreter?data=" + java.net.URLEncoder.encode(overpassQuery, "UTF-8");
                ResponseEntity<String> overpassResp = restTemplate.getForEntity(overpassUrl, String.class);
                JsonNode overpassJson = objectMapper.readTree(overpassResp.getBody());
                JsonNode elements = overpassJson.path("elements");
                if (elements.isArray() && elements.size() > 0) {
                    schoolProximity = 1.0;
                }

                String hospitalQuery = String.format("[out:json];(node[\"amenity\"~\"hospital|clinic\"](around:500,%f,%f);way[\"amenity\"~\"hospital|clinic\"](around:500,%f,%f););out center;", 
                    latitude, longitude, latitude, longitude);
                String hospitalUrl = "https://overpass-api.de/api/interpreter?data=" + java.net.URLEncoder.encode(hospitalQuery, "UTF-8");
                ResponseEntity<String> hospitalResp = restTemplate.getForEntity(hospitalUrl, String.class);
                JsonNode hospitalJson = objectMapper.readTree(hospitalResp.getBody());
                JsonNode hElements = hospitalJson.path("elements");
                if (hElements.isArray() && hElements.size() > 0) {
                    hospitalProximity = 1.0;
                }
            } catch (Exception e) {
                System.err.println("Overpass API failed in PriorityEngine: " + e.getMessage());
            }
        }

        // Deterministic mock for other metrics based on coords
        double roadImportance = (latitude != null) ? Math.abs(latitude.doubleValue() % 1.0) : 0.5;
        double trafficDensity = (longitude != null) ? Math.abs(longitude.doubleValue() % 1.0) : 0.5;
        double populationDensity = (latitude != null && longitude != null) ? Math.abs((latitude.doubleValue() * longitude.doubleValue()) % 1.0) : 0.5;
        
        // Normalize support count (assume max 1000 for normalization)
        double normalizedSupportCount = Math.min(supportCount / 1000.0, 1.0);
        
        double weatherRiskFactor = 0.2;
        if (latitude != null && longitude != null) {
            try {
                String weatherUrl = String.format("https://api.open-meteo.com/v1/forecast?latitude=%f&longitude=%f&current_weather=true", latitude, longitude);
                ResponseEntity<String> weatherResp = restTemplate.getForEntity(weatherUrl, String.class);
                JsonNode weatherJson = objectMapper.readTree(weatherResp.getBody());
                JsonNode current = weatherJson.path("current_weather");
                if (!current.isMissingNode()) {
                    int weatherCode = current.path("weathercode").asInt(0);
                    // WMO codes: >= 61 means Rain/Snow/Thunderstorms
                    if (weatherCode >= 61) {
                        weatherRiskFactor = 1.0;
                    }
                }
            } catch (Exception e) {
                System.err.println("Open-Meteo API failed in PriorityEngine: " + e.getMessage());
            }
        }

        // Apply Formula from Master Prompt (Sec 9)
        double score = 
              0.30 * severityScore
            + 0.15 * roadImportance
            + 0.10 * schoolProximity
            + 0.10 * hospitalProximity
            + 0.10 * trafficDensity
            + 0.10 * populationDensity
            + 0.10 * normalizedSupportCount
            + 0.05 * weatherRiskFactor;

        result.priorityScore = BigDecimal.valueOf(score).setScale(4, RoundingMode.HALF_UP);

        if (score >= 0.75) {
            result.priorityBand = PriorityBand.CRITICAL;
        } else if (score >= 0.50) {
            result.priorityBand = PriorityBand.HIGH;
        } else if (score >= 0.25) {
            result.priorityBand = PriorityBand.MEDIUM;
        } else {
            result.priorityBand = PriorityBand.LOW;
        }

        return result;
    }
}
