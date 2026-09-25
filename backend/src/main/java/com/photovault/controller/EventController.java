package com.photovault.controller;

import com.photovault.dto.CreateEventRequest;
import com.photovault.dto.EventResponse;
import com.photovault.dto.UpdateEventRequest;
import com.photovault.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for Photographer Event Management.
 */
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody CreateEventRequest request) {
        EventResponse created = eventService.createEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<EventResponse>> getAllEvents() {
        List<EventResponse> events = eventService.getAllEvents();
        return ResponseEntity.ok(events);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable Long id) {
        EventResponse event = eventService.getEventById(id);
        return ResponseEntity.ok(event);
    }

    @GetMapping("/code/{accessCode}")
    public ResponseEntity<EventResponse> getEventByAccessCode(@PathVariable String accessCode) {
        EventResponse event = eventService.getEventByAccessCode(accessCode);
        return ResponseEntity.ok(event);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable Long id,
            @RequestBody UpdateEventRequest request) {
        EventResponse updated = eventService.updateEvent(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
