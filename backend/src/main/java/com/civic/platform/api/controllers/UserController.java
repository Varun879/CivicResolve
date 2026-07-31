package com.civic.platform.api.controllers;

import com.civic.platform.api.dto.AuthResponse;
import com.civic.platform.api.dto.EmailUpdateRequest;
import com.civic.platform.api.dto.VerifyOtpRequest;
import com.civic.platform.domain.entities.Complaint;
import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.repositories.*;
import com.civic.platform.domain.services.EmailService;
import com.civic.platform.domain.services.OtpService;
import com.civic.platform.security.JwtUtil;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    private final VoteRepository voteRepository;
    private final CommentRepository commentRepository;
    private final NotificationRepository notificationRepository;
    private final RewardTransactionRepository rewardTransactionRepository;
    private final EmailService emailService;
    private final OtpService otpService;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Map<String, Object> map = new HashMap<>();
        map.put("name", user.getName());
        map.put("email", user.getEmail());
        map.put("phone", user.getPhone());
        return ResponseEntity.ok(map);
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> request) {
        
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (request.containsKey("name")) {
            user.setName(request.get("name"));
        }
        if (request.containsKey("phone")) {
            user.setPhone(request.get("phone"));
        }
        
        userRepository.save(user);

        Map<String, Object> map = new HashMap<>();
        map.put("name", user.getName());
        map.put("email", user.getEmail());
        map.put("phone", user.getPhone());
        return ResponseEntity.ok(map);
    }

    @PostMapping("/me/email/request-otp")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> requestEmailUpdateOtp(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody EmailUpdateRequest request) {
        
        if (userRepository.findByEmail(request.getNewEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already in use");
        }

        String otp = otpService.generateAndSaveOtp(request.getNewEmail());
        try {
            emailService.sendOtpEmail(request.getNewEmail(), otp);
            return ResponseEntity.ok(Map.of("message", "OTP sent successfully to " + request.getNewEmail()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to send OTP email: " + e.getMessage());
        }
    }

    @PostMapping("/me/email/verify-otp")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> verifyEmailUpdateOtp(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VerifyOtpRequest request,
            HttpServletResponse response) {
        
        boolean isVerified = otpService.verifyOtp(request.getNewEmail(), request.getOtp());
        
        if (!isVerified) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (userRepository.findByEmail(request.getNewEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already in use");
        }

        user.setEmail(request.getNewEmail());
        userRepository.save(user);

        // Generate a new JWT since the username (email) has changed
        UserDetails newUserDetails = userDetailsService.loadUserByUsername(request.getNewEmail());
        String token = jwtUtil.generateToken(newUserDetails);
        String role = newUserDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("ROLE_CITIZEN");
        AuthResponse authResponse = new AuthResponse(token, newUserDetails.getUsername(), role);
        setJwtCookie(response, authResponse.getToken());
        return ResponseEntity.ok(authResponse);
    }

    private void setJwtCookie(HttpServletResponse response, String token) {
        org.springframework.http.ResponseCookie resCookie = org.springframework.http.ResponseCookie.from("civic_jwt", token)
                .httpOnly(true)
                .secure(false) // For local testing, ideally set to true in production
                .sameSite("Strict")
                .path("/")
                .maxAge(15 * 60)
                .build();
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, resCookie.toString());
    }

    @PostMapping("/me/phone/verify-firebase")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> verifyFirebasePhone(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> request) {
        
        String token = request.get("firebaseToken");
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body("Firebase token is required");
        }

        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
            String phoneNumber = (String) decodedToken.getClaims().get("phone_number");
            
            if (phoneNumber == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("No phone number found in Firebase token");
            }

            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            user.setPhone(phoneNumber);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Phone updated successfully", "phone", phoneNumber));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Firebase token: " + e.getMessage());
        }
    }

    @DeleteMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<?> deleteMyAccount(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        UUID userId = user.getId();
        
        List<Complaint> myComplaints = complaintRepository.findByCitizenId(userId);
        for (Complaint c : myComplaints) {
            voteRepository.deleteByComplaintId(c.getId());
            commentRepository.deleteByComplaintId(c.getId());
        }
        
        voteRepository.deleteByCitizenId(userId);
        commentRepository.deleteByAuthorId(userId);
        notificationRepository.deleteByCitizenId(userId);
        rewardTransactionRepository.deleteByCitizenId(userId);
        complaintRepository.deleteAll(myComplaints);
        
        userRepository.delete(user);
        
        return ResponseEntity.ok(Map.of("message", "Account and all associated data permanently deleted"));
    }

}
