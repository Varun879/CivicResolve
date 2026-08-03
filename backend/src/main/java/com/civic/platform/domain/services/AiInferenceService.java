package com.civic.platform.domain.services;

import com.civic.platform.domain.enums.Category;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.math.BigDecimal;
import java.util.Random;
import java.util.Map;
import java.util.HashMap;
import java.util.Arrays;

@Service
public class AiInferenceService {

    public static class AiInferenceResult {
        public Category category;
        public String secondaryCategory;
        public int baseSeverity;
        public String locationSensitivity;
        public String priority;
        public BigDecimal confidenceScore;
        public String justification;
        public String notes;
        public int estimatedResolutionHours;
        public String severity;
    }

    private final Random random = new Random();

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiInferenceResult analyzeImage(String imageBase64, Category userReportedCategory, String description, BigDecimal latitude, BigDecimal longitude) {
        AiInferenceResult result = new AiInferenceResult();
        
        if (apiKey == null || apiKey.isEmpty() || imageBase64 == null || imageBase64.isEmpty()) {
            return fallbackMock(userReportedCategory, description);
        }

        try {
            String mimeType = "image/jpeg";
            String base64Data = imageBase64;
            
            if (imageBase64.contains(",")) {
                String[] parts = imageBase64.split(",");
                mimeType = parts[0].replace("data:", "").replace(";base64", "");
                base64Data = parts[1];
            }

            ObjectNode locationContext = objectMapper.createObjectNode();
            locationContext.put("address", "Unknown");
            locationContext.put("zone_type", "unknown");
            ArrayNode nearbyPlaces = locationContext.putArray("nearby_places");

            if (latitude != null && longitude != null) {
                try {
                    String overpassQuery = String.format(java.util.Locale.US, "[out:json];(node[\"amenity\"~\"school|hospital|clinic|police|fire_station|marketplace\"](around:500,%f,%f);way[\"amenity\"~\"school|hospital|clinic|police|fire_station|marketplace\"](around:500,%f,%f););out center;", 
                        latitude, longitude, latitude, longitude);
                    org.springframework.http.HttpHeaders overpassHeaders = new org.springframework.http.HttpHeaders();
                    overpassHeaders.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);
                    org.springframework.util.MultiValueMap<String, String> map = new org.springframework.util.LinkedMultiValueMap<>();
                    map.add("data", overpassQuery);
                    org.springframework.http.HttpEntity<org.springframework.util.MultiValueMap<String, String>> overpassRequest = new org.springframework.http.HttpEntity<>(map, overpassHeaders);
                    
                    ResponseEntity<String> overpassResp = restTemplate.postForEntity("https://overpass-api.de/api/interpreter", overpassRequest, String.class);
                    JsonNode overpassJson = objectMapper.readTree(overpassResp.getBody());
                    JsonNode elements = overpassJson.path("elements");
                    
                    if (elements.isArray()) {
                        for (JsonNode element : elements) {
                            JsonNode tags = element.path("tags");
                            String amenity = tags.path("amenity").asText("other");
                            String name = tags.path("name").asText("Unnamed " + amenity);
                            
                            ObjectNode place = objectMapper.createObjectNode();
                            place.put("type", amenity);
                            place.put("name", name);
                            place.put("distance_meters", 250); // mock distance as we don't have exact routing
                            nearbyPlaces.add(place);
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Overpass API failed: " + e.getMessage());
                }
            }

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

            String systemPrompt = "You are the image-analysis engine for a city \"Report an Issue\" app. You will be given:\n" +
                "1. A photo uploaded by a citizen.\n" +
                "2. Structured location context (nearby points of interest, zone type, address) already resolved by the app's geolocation service.\n\n" +
                "Your job is to:\n" +
                "A. Identify what civic issue is shown in the photo.\n" +
                "B. Assign it to exactly one category from the fixed list below.\n" +
                "C. Assign a priority level, using BOTH the visual severity of the issue AND the sensitivity of the surrounding location.\n" +
                "D. Return a short human-readable justification.\n\n" +
                "You must respond in strict JSON only. No prose outside JSON.\n\n" +
                "--------------------------------------------------------------------\n" +
                "STEP 1 — CATEGORY CLASSIFICATION\n" +
                "--------------------------------------------------------------------\n" +
                "Look at the image and choose the single best-fitting category from this fixed list:\n" +
                "- GARBAGE\n- ILLEGAL_DUMPING\n- POTHOLE\n- DAMAGED_ROAD\n- STREETLIGHT\n- WATER_LEAKAGE\n- SEWAGE_OVERFLOW\n- DRAINAGE_BLOCKAGE\n- FALLEN_TREE\n- FOOTPATH_DAMAGE\n- PUBLIC_PROPERTY_DAMAGE\n- OTHER\n\n" +
                "Base this purely on visual evidence in the photo.\n\n" +
                "--------------------------------------------------------------------\n" +
                "STEP 2 — BASE SEVERITY (from the image itself)\n" +
                "--------------------------------------------------------------------\n" +
                "Rate visual severity 1–5 (1=minor, 5=severe/hazardous).\n\n" +
                "--------------------------------------------------------------------\n" +
                "STEP 3 — LOCATION SENSITIVITY MULTIPLIER (from provided context)\n" +
                "--------------------------------------------------------------------\n" +
                "Using the location context JSON provided by the app:\n" +
                "HIGH sensitivity if within ~200m of School, Hospital, Clinic, etc.\n" +
                "MEDIUM sensitivity if within ~200–500m of above.\n" +
                "LOW sensitivity if none apply.\n\n" +
                "--------------------------------------------------------------------\n" +
                "STEP 4 — FINAL PRIORITY DECISION\n" +
                "--------------------------------------------------------------------\n" +
                "Combine base severity and location sensitivity:\n" +
                "Severity 1: LOW, LOW, MEDIUM\n" +
                "Severity 2: LOW, MEDIUM, MEDIUM\n" +
                "Severity 3: MEDIUM, MEDIUM, HIGH\n" +
                "Severity 4: MEDIUM, HIGH, HIGH\n" +
                "Severity 5: HIGH, HIGH, CRITICAL\n\n" +
                "--------------------------------------------------------------------\n" +
                "OUTPUT FORMAT (strict JSON, no other text)\n" +
                "--------------------------------------------------------------------\n" +
                "{\n" +
                "  \"category\": \"<one of the fixed categories>\",\n" +
                "  \"secondary_category\": \"<optional, or null>\",\n" +
                "  \"base_severity\": <1-5>,\n" +
                "  \"location_sensitivity\": \"LOW | MEDIUM | HIGH\",\n" +
                "  \"priority\": \"LOW | MEDIUM | HIGH | CRITICAL\",\n" +
                "  \"confidence\": <0.0-1.0>,\n" +
                "  \"justification\": \"<1-2 sentence plain-language explanation>\",\n" +
                "  \"notes\": \"<any caveats>\"\n" +
                "}\n" +
                "User description provided: " + (description != null ? description : "None");

            // Build Gemini request body
            Map<String, Object> textPrompt = new HashMap<>();
            textPrompt.put("text", systemPrompt + "\n\nLocation context:\n" + locationContext.toString());

            Map<String, Object> inlineData = new HashMap<>();
            inlineData.put("mimeType", mimeType);
            inlineData.put("data", base64Data);

            Map<String, Object> imagePart = new HashMap<>();
            imagePart.put("inlineData", inlineData);

            Map<String, Object> content = new HashMap<>();
            content.put("parts", Arrays.asList(textPrompt, imagePart));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", Arrays.asList(content));
            
            Map<String, Object> genConfig = new HashMap<>();
            genConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", genConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            
            String jsonText = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            jsonText = jsonText.replaceAll("(?s)^```(?:json)?|```$", "").trim();
            System.out.println("AI Response: " + jsonText);
            
            JsonNode aiResponse = objectMapper.readTree(jsonText);
            
            result.category = Category.valueOf(aiResponse.path("category").asText(userReportedCategory != null ? userReportedCategory.name() : "OTHER"));
            result.secondaryCategory = aiResponse.path("secondary_category").asText("");
            result.baseSeverity = aiResponse.path("base_severity").asInt(3);
            result.locationSensitivity = aiResponse.path("location_sensitivity").asText("MEDIUM");
            result.priority = aiResponse.path("priority").asText("MEDIUM");
            result.confidenceScore = BigDecimal.valueOf(aiResponse.path("confidence").asDouble(0.85));
            result.justification = aiResponse.path("justification").asText("");
            result.notes = aiResponse.path("notes").asText("");
            
            // Map severity to string for entity
            if (result.baseSeverity >= 4) {
                result.severity = "HIGH";
            } else if (result.baseSeverity == 3) {
                result.severity = "MEDIUM";
            } else {
                result.severity = "LOW";
            }
            if (result.priority.equals("CRITICAL")) {
                result.severity = "CRITICAL";
            }
            
            result.estimatedResolutionHours = 48; // Can be enhanced later

            return result;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            e.printStackTrace();
            AiInferenceResult mock = fallbackMock(userReportedCategory, description);
            try {
                JsonNode err = objectMapper.readTree(e.getResponseBodyAsString());
                mock.justification = "AI Analysis Failed: " + err.path("error").path("message").asText();
            } catch (Exception ex) {
                mock.justification = "AI Analysis Failed: " + e.getMessage();
            }
            return mock;
        } catch (Exception e) {
            e.printStackTrace();
            return fallbackMock(userReportedCategory, description);
        }
    }

    private AiInferenceResult fallbackMock(Category userReportedCategory, String description) {
        AiInferenceResult result = new AiInferenceResult();
        result.category = (userReportedCategory != null && random.nextDouble() > 0.1) 
                ? userReportedCategory 
                : Category.OTHER;

        double conf = 0.75 + (0.24 * random.nextDouble());
        result.confidenceScore = BigDecimal.valueOf(conf);
        result.baseSeverity = 3;
        result.locationSensitivity = "MEDIUM";
        result.justification = "Fell back to mock categorization due to AI failure.";
        result.notes = "";

        String text = description != null ? description.toLowerCase() : "";
        if (text.contains("emergency") || text.contains("danger") || text.contains("accident") || text.contains("critical")) {
            result.priority = "CRITICAL";
            result.severity = "CRITICAL";
        } else if (text.contains("severe") || text.contains("large") || text.contains("blocked") || text.contains("overflow")) {
            result.priority = "HIGH";
            result.severity = "HIGH";
        } else if (text.contains("small") || text.contains("minor") || text.contains("slight")) {
            result.priority = "LOW";
            result.severity = "LOW";
        } else {
            result.priority = "MEDIUM";
            result.severity = "MEDIUM";
        }

        switch (result.priority) {
            case "CRITICAL": result.estimatedResolutionHours = 2; break;
            case "HIGH": result.estimatedResolutionHours = 24; break;
            case "LOW": result.estimatedResolutionHours = 168; break; 
            default: result.estimatedResolutionHours = 72; break; 
        }

        return result;
    }
}
