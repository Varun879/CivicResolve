package com.civic.platform.api.controllers;

import com.civic.platform.api.dto.AuthRequest;
import com.civic.platform.api.dto.AuthResponse;
import com.civic.platform.security.JwtUtil;
import com.civic.platform.api.dto.GoogleAuthRequest;
import com.civic.platform.api.dto.RegisterRequest;
import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.enums.AuthProvider;
import com.civic.platform.domain.repositories.UserRepository;
import com.civic.platform.domain.services.EmailService;
import com.civic.platform.domain.services.OtpService;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;

import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserDetailsService userDetailsService;
    private final OtpService otpService;
    private final EmailService emailService;

    @Value("${app.dev-otp-bypass:false}")
    private boolean devOtpBypass;

    @Value("${app.cookie-secure:true}")
    private boolean cookieSecure;

    private final java.util.concurrent.ConcurrentHashMap<String, Integer> loginAttempts = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.ConcurrentHashMap<String, Long> loginLockouts = new java.util.concurrent.ConcurrentHashMap<>();

    private final java.util.concurrent.ConcurrentHashMap<String, Integer> otpAttempts = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.concurrent.ConcurrentHashMap<String, Long> otpLockouts = new java.util.concurrent.ConcurrentHashMap<>();

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request, HttpServletResponse response) {
        String email = request.getEmail();
        if (loginLockouts.containsKey(email)) {
            if (System.currentTimeMillis() < loginLockouts.get(email)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", "Too many failed login attempts. Try again later."));
            } else {
                loginLockouts.remove(email);
                loginAttempts.remove(email);
            }
        }

        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
            loginAttempts.remove(email);
            loginLockouts.remove(email);

            UserDetails userDetails = (UserDetails) auth.getPrincipal();
            AuthResponse authResponse = generateResponse(userDetails);
            setJwtCookie(response, authResponse.getToken());
            return ResponseEntity.ok(authResponse);
        } catch (org.springframework.security.core.AuthenticationException e) {
            int attempts = loginAttempts.getOrDefault(email, 0) + 1;
            if (attempts >= 5) {
                loginLockouts.put(email, System.currentTimeMillis() + 15 * 60 * 1000); // 15 mins
            } else {
                loginAttempts.put(email, attempts);
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid credentials"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        org.springframework.http.ResponseCookie resCookie = org.springframework.http.ResponseCookie.from("civic_jwt", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, resCookie.toString());
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @PostMapping("/request-otp")
    public ResponseEntity<?> requestSignupOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        if (otpLockouts.containsKey(email)) {
            if (System.currentTimeMillis() < otpLockouts.get(email)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", "Too many OTP requests. Try again later."));
            } else {
                otpLockouts.remove(email);
                otpAttempts.remove(email);
            }
        }
        
        int attempts = otpAttempts.getOrDefault(email, 0) + 1;
        if (attempts > 3) {
            otpLockouts.put(email, System.currentTimeMillis() + 60 * 60 * 1000); // 1 hour
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", "Too many OTP requests. Try again later."));
        }
        otpAttempts.put(email, attempts);

        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("An account with this email already exists");
        }
        String otp = otpService.generateAndSaveOtp(email);
        try {
            emailService.sendOtpEmail(email, otp);
            return ResponseEntity.ok(Map.of("message", "Verification code sent successfully to " + email));
        } catch (Exception e) {
            System.err.println("SMTP email send failed for signup OTP: " + e.getMessage());
            return ResponseEntity.ok(Map.of(
                "message", "Verification code generated (Check server logs or contact support)"
            ));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        try {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already exists");
            }

            if (request.getOtp() == null || request.getOtp().isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("OTP verification is required during signup");
            }
            boolean isOtpValid = otpService.verifyOtp(request.getEmail(), request.getOtp());
            
            if (!isOtpValid) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid or expired verification code");
            }

            User user = new User();
            user.setEmail(request.getEmail());
            user.setName(request.getName());
            // Set empty phone to null to avoid unique constraint issues
            String phone = request.getPhone();
            user.setPhone((phone != null && !phone.isBlank()) ? phone : null);
            user.setRole(com.civic.platform.domain.enums.Role.CITIZEN);
            user.setDepartment(request.getDepartment());
            user.setLocation(request.getLocation());
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            user.setAuthProvider(AuthProvider.LOCAL);
            userRepository.save(user);

            // Auto login after register
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            UserDetails userDetails = (UserDetails) auth.getPrincipal();
            AuthResponse authResponse = generateResponse(userDetails);
            setJwtCookie(response, authResponse.getToken());
            return ResponseEntity.ok(authResponse);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Registration failed: " + e.getMessage());
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@Valid @RequestBody GoogleAuthRequest request, HttpServletResponse response) {
        try {
            String email;
            String name;

            if ("LOCAL_MOCK_GOOGLE_TOKEN".equals(request.getIdToken())) {
                email = "mock.google.user@example.com";
                name = "Mock Google User";
            } else {
                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(request.getIdToken());
                email = decodedToken.getEmail();
                name = decodedToken.getName();
            }

            Optional<User> existingUser = userRepository.findByEmail(email);

            if (existingUser.isPresent()) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                AuthResponse authResponse = generateResponse(userDetails);
                setJwtCookie(response, authResponse.getToken());
                return ResponseEntity.ok(authResponse);
            } else {
                User newUser = new User();
                newUser.setEmail(email);
                newUser.setName(name != null ? name : "Google User");
                newUser.setRole(com.civic.platform.domain.enums.Role.CITIZEN);
                newUser.setDepartment(request.getDepartment());
                newUser.setLocation(request.getLocation());
                // Dummy password since Google handles auth
                newUser.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
                newUser.setAuthProvider(AuthProvider.GOOGLE);
                userRepository.save(newUser);

                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                AuthResponse authResponse = generateResponse(userDetails);
                setJwtCookie(response, authResponse.getToken());
                return ResponseEntity.ok(authResponse);
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Error: " + e.getMessage());
        }
    }

    private AuthResponse generateResponse(UserDetails userDetails) {
        String token = jwtUtil.generateToken(userDetails);
        String role = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("ROLE_CITIZEN");
        return new AuthResponse(token, userDetails.getUsername(), role);
    }

    private void setJwtCookie(HttpServletResponse response, String token) {
        org.springframework.http.ResponseCookie resCookie = org.springframework.http.ResponseCookie.from("civic_jwt", token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(15 * 60)
                .build();
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, resCookie.toString());
    }
}
