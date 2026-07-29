package com.civic.platform.domain.services;

import com.civic.platform.domain.entities.Complaint;
import com.civic.platform.domain.enums.Category;
import com.civic.platform.domain.repositories.ComplaintRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GeoServiceTest {

    @Mock
    private ComplaintRepository complaintRepository;

    @InjectMocks
    private GeoService geoService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void findDuplicate_WhenDuplicateExists_ReturnsDuplicate() {
        Complaint newComplaint = new Complaint();
        newComplaint.setLatitude(new java.math.BigDecimal("12.9716"));
        newComplaint.setLongitude(new java.math.BigDecimal("77.5946"));
        newComplaint.setCategory(Category.POTHOLE);

        Complaint existingComplaint = new Complaint();
        existingComplaint.setId(java.util.UUID.randomUUID());

        when(complaintRepository.findPotentialDuplicates(
                any(String.class), any(ZonedDateTime.class), any(Double.class), any(Double.class)))
                .thenReturn(Collections.singletonList(existingComplaint));

        Optional<Complaint> result = geoService.findDuplicate(newComplaint);

        assertTrue(result.isPresent());
        assertEquals(existingComplaint.getId(), result.get().getId());
    }

    @Test
    void findDuplicate_WhenNoDuplicate_ReturnsEmpty() {
        Complaint newComplaint = new Complaint();
        newComplaint.setLatitude(new java.math.BigDecimal("12.9716"));
        newComplaint.setLongitude(new java.math.BigDecimal("77.5946"));
        newComplaint.setCategory(Category.POTHOLE);

        when(complaintRepository.findPotentialDuplicates(
                any(String.class), any(ZonedDateTime.class), any(Double.class), any(Double.class)))
                .thenReturn(Collections.emptyList());

        Optional<Complaint> result = geoService.findDuplicate(newComplaint);

        assertFalse(result.isPresent());
    }
}
