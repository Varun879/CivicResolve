package com.civic.platform.domain.services;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final StringRedisTemplate redisTemplate;
    private static final String OTP_PREFIX = "email-otp:";

    private static final long OTP_VALIDITY_MINUTES = 5;

    public String generateAndSaveOtp(String email) {
        // Generate a 6-digit secure random OTP
        SecureRandom random = new SecureRandom();
        int otpValue = 100000 + random.nextInt(900000);
        String otp = String.valueOf(otpValue);

        // Save to Redis with 5 minutes expiration
        redisTemplate.opsForValue().set(
                OTP_PREFIX + email,
                otp,
                OTP_VALIDITY_MINUTES,
                TimeUnit.MINUTES
        );

        System.out.println(">>> [OTP GENERATED] Email: " + email + " | OTP: " + otp + " <<<");
        return otp;
    }

    public boolean verifyOtp(String email, String otp) {
        String savedOtp = redisTemplate.opsForValue().get(OTP_PREFIX + email);
        if (savedOtp != null && savedOtp.equals(otp)) {
            // Delete OTP after successful verification to prevent reuse
            redisTemplate.delete(OTP_PREFIX + email);
            return true;
        }
        return false;
    }
    
}
