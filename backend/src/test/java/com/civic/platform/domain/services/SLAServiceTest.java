package com.civic.platform.domain.services;

import com.civic.platform.domain.entities.Complaint;
import com.civic.platform.domain.enums.ComplaintStatus;
import com.civic.platform.domain.enums.PriorityBand;
import com.civic.platform.domain.repositories.ComplaintRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.ZonedDateTime;
import java.util.Collections;

import static org.mockito.Mockito.*;

class SLAServiceTest {

    @Mock
    private ComplaintRepository complaintRepository;

    @InjectMocks
    private SLAService slaService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void checkSLABreaches_EscalatesWhenOverdue() {
        Complaint overdueComplaint = new Complaint();
        overdueComplaint.setStatus(ComplaintStatus.ASSIGNED);
        overdueComplaint.setPriorityBand(PriorityBand.HIGH);
        // Created 49 hours ago, HIGH SLA is 48 hours -> Should trigger 100% breach logic
        overdueComplaint.setCreatedAt(ZonedDateTime.now().minusHours(49));
        overdueComplaint.setSlaDeadline(ZonedDateTime.now().minusHours(1));

        when(complaintRepository.findBreachedComplaints(any(ZonedDateTime.class)))
                .thenReturn(Collections.singletonList(overdueComplaint));

        slaService.checkSlaBreaches();

        verify(complaintRepository, times(1)).save(overdueComplaint);
    }
    
    @Test
    void checkSLABreaches_DoesNotEscalateWhenNotOverdue() {
        Complaint activeComplaint = new Complaint();
        activeComplaint.setStatus(ComplaintStatus.ASSIGNED);
        activeComplaint.setPriorityBand(PriorityBand.HIGH);
        // Created 2 hours ago, HIGH SLA is 48 hours -> Should NOT trigger breach
        activeComplaint.setCreatedAt(ZonedDateTime.now().minusHours(2));
        activeComplaint.setSlaDeadline(ZonedDateTime.now().plusHours(46));

        when(complaintRepository.findBreachedComplaints(any(ZonedDateTime.class)))
                .thenReturn(Collections.singletonList(activeComplaint));

        slaService.checkSlaBreaches();

        verify(complaintRepository, never()).save(activeComplaint);
    }
}
