package com.civic.platform.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;

@Component
@Order(1)
public class RateLimitFilter implements Filter {

    // 100 requests per minute per IP
    private final java.util.concurrent.ConcurrentHashMap<String, Bucket> buckets = new java.util.concurrent.ConcurrentHashMap<>();
    
    // 5 requests per 15 minutes per IP for Auth endpoints
    private final java.util.concurrent.ConcurrentHashMap<String, Bucket> authBuckets = new java.util.concurrent.ConcurrentHashMap<>();

    private Bucket createNewBucket() {
        Bandwidth limit = Bandwidth.builder().capacity(100).refillGreedy(100, Duration.ofMinutes(1)).build();
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createAuthBucket() {
        Bandwidth limit = Bandwidth.builder().capacity(5).refillGreedy(5, Duration.ofMinutes(15)).build();
        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse res = (HttpServletResponse) response;
        jakarta.servlet.http.HttpServletRequest req = (jakarta.servlet.http.HttpServletRequest) request;

        String ip = req.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        
        String path = req.getRequestURI();
        
        if (path.equals("/api/v1/auth/login") || path.equals("/api/v1/auth/request-otp")) {
            Bucket authBucket = authBuckets.computeIfAbsent(ip, k -> createAuthBucket());
            if (!authBucket.tryConsume(1)) {
                res.setStatus(429); // Too Many Requests
                res.getWriter().write("Too many authentication attempts from this IP");
                return;
            }
        }

        Bucket bucket = buckets.computeIfAbsent(ip, k -> createNewBucket());

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            res.setStatus(429); // Too Many Requests
            res.getWriter().write("Too many requests from this IP");
        }
    }
}
