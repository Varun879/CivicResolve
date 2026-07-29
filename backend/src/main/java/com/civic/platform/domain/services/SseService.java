package com.civic.platform.domain.services;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseService {

    // Map complaint ID to a list of active SseEmitters listening to it
    private final Map<UUID, List<SseEmitter>> emittersMap = new ConcurrentHashMap<>();

    public SseEmitter subscribeToComplaint(UUID complaintId) {
        // Set timeout to 1 hour (3600000ms), or let it be -1 for infinite
        SseEmitter emitter = new SseEmitter(3600000L);
        
        emittersMap.putIfAbsent(complaintId, new CopyOnWriteArrayList<>());
        emittersMap.get(complaintId).add(emitter);

        emitter.onCompletion(() -> removeEmitter(complaintId, emitter));
        emitter.onTimeout(() -> removeEmitter(complaintId, emitter));
        emitter.onError((e) -> removeEmitter(complaintId, emitter));

        // Send an initial event to keep connection alive
        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected"));
        } catch (IOException e) {
            removeEmitter(complaintId, emitter);
        }

        return emitter;
    }

    public void emitComplaintUpdate(UUID complaintId) {
        List<SseEmitter> emitters = emittersMap.get(complaintId);
        if (emitters != null) {
            for (SseEmitter emitter : emitters) {
                try {
                    // We only send a signal to refresh, frontend will fetch the latest data
                    emitter.send(SseEmitter.event().name("COMPLAINT_UPDATE").data("{\"updated\":true}"));
                } catch (IOException e) {
                    emitter.complete();
                    removeEmitter(complaintId, emitter);
                }
            }
        }
    }

    private void removeEmitter(UUID complaintId, SseEmitter emitter) {
        List<SseEmitter> emitters = emittersMap.get(complaintId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                emittersMap.remove(complaintId);
            }
        }
    }
}
