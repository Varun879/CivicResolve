package com.civic.platform.domain.services;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Year;

@Service
public class IdGeneratorService {

    private final JdbcTemplate jdbcTemplate;

    public IdGeneratorService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        initSequence();
    }

    private void initSequence() {
        jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS complaint_public_seq START 1");
    }

    public String generatePublicId() {
        Long nextVal = jdbcTemplate.queryForObject("SELECT nextval('complaint_public_seq')", Long.class);
        return String.format("CIV-%d-%06d", Year.now().getValue(), nextVal);
    }
}
