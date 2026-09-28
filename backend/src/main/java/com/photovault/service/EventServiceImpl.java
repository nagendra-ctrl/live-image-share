package com.photovault.service;

import com.photovault.dto.CreateEventRequest;
import com.photovault.dto.EventResponse;
import com.photovault.dto.UpdateEventRequest;
import com.photovault.entity.Album;
import com.photovault.entity.Event;
import com.photovault.entity.EventType;
import com.photovault.repository.AlbumRepository;
import com.photovault.repository.EventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@Transactional
public class EventServiceImpl implements EventService {

    private static final Logger log = LoggerFactory.getLogger(EventServiceImpl.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EventRepository eventRepository;
    private final AlbumRepository albumRepository;

    public EventServiceImpl(EventRepository eventRepository, AlbumRepository albumRepository) {
        this.eventRepository = eventRepository;
        this.albumRepository = albumRepository;
    }

    @Override
    public EventResponse createEvent(CreateEventRequest request) {
        log.info("Creating new event: '{}' ({}) for client: '{}'", 
            request.eventName(), request.eventType(), request.customerName());

        Event event = new Event();
        event.setEventName(request.eventName());
        event.setEventType(request.eventType());
        event.setCustomerName(request.customerName());
        event.setCustomerEmail(request.customerEmail());
        event.setCustomerPhone(request.customerPhone());
        event.setEventDate(request.eventDate());
        event.setLocation(request.location());
        event.setDescription(request.description());
        event.setInstagramHandle(request.instagramHandle());
        event.setWhatsappNumber(request.whatsappNumber());
        
        // Default cover photo if none provided
        String cover = request.coverImage() != null && !request.coverImage().isBlank() 
            ? request.coverImage() 
            : "/wedding_couple_hero.jpg";
        event.setCoverImage(cover);

        // Generate guaranteed unique gallery access code
        String uniqueCode = generateUniqueAccessCode(request.eventType(), request.eventDate());
        event.setAccessCode(uniqueCode);

        // Save event first to obtain generated ID
        Event savedEvent = eventRepository.save(event);

        // Create default albums for this event type
        createDefaultAlbums(savedEvent);

        log.info("Event successfully created with ID: {} and Access Code: {}", savedEvent.getId(), savedEvent.getAccessCode());
        return EventResponse.fromEntity(savedEvent);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventResponse> getAllEvents() {
        return eventRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(EventResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EventResponse getEventById(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Event not found with ID: " + id));
        return EventResponse.fromEntity(event);
    }

    @Override
    @Transactional(readOnly = true)
    public EventResponse getEventByAccessCode(String accessCode) {
        Event event = eventRepository.findByAccessCode(accessCode.trim().toUpperCase())
                .orElseThrow(() -> new NoSuchElementException("Event not found with Access Code: " + accessCode));
        return EventResponse.fromEntity(event);
    }

    @Override
    public EventResponse updateEvent(Long id, UpdateEventRequest request) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Event not found with ID: " + id));

        if (request.eventName() != null) event.setEventName(request.eventName());
        if (request.eventType() != null) event.setEventType(request.eventType());
        if (request.customerName() != null) event.setCustomerName(request.customerName());
        if (request.customerEmail() != null) event.setCustomerEmail(request.customerEmail());
        if (request.customerPhone() != null) event.setCustomerPhone(request.customerPhone());
        if (request.eventDate() != null) event.setEventDate(request.eventDate());
        if (request.location() != null) event.setLocation(request.location());
        if (request.description() != null) event.setDescription(request.description());
        if (request.coverImage() != null) event.setCoverImage(request.coverImage());
        if (request.instagramHandle() != null) event.setInstagramHandle(request.instagramHandle());
        if (request.whatsappNumber() != null) event.setWhatsappNumber(request.whatsappNumber());
        if (request.isActive() != null) event.setIsActive(request.isActive());

        Event updated = eventRepository.save(event);
        log.info("Event ID {} updated successfully", id);
        return EventResponse.fromEntity(updated);
    }

    @Override
    public void deleteEvent(Long id) {
        if (!eventRepository.existsById(id)) {
            throw new NoSuchElementException("Event not found with ID: " + id);
        }
        eventRepository.deleteById(id);
        log.info("Event ID {} deleted successfully", id);
    }

    /**
     * Generates a unique gallery access code formatted as: {PREFIX}-{YEAR}-{4_RANDOM_DIGITS}
     * Example: WED-2026-8421
     */
    private String generateUniqueAccessCode(EventType eventType, LocalDate date) {
        String prefix = eventType != null ? eventType.getCodePrefix() : "EVT";
        int year = date != null ? date.getYear() : LocalDate.now().getYear();

        String code;
        int attempts = 0;
        do {
            int randomPart = 1000 + RANDOM.nextInt(9000); // 4-digit random number (1000 - 9999)
            code = String.format("%s-%d-%04d", prefix, year, randomPart);
            attempts++;
            if (attempts > 50) {
                // Fallback with timestamp millis to guarantee uniqueness
                code = String.format("%s-%d-%d", prefix, year, System.currentTimeMillis() % 10000);
                break;
            }
        } while (eventRepository.existsByAccessCode(code));

        return code;
    }

    /**
     * Creates default albums tailored to the event category.
     */
    private void createDefaultAlbums(Event event) {
        List<String> albumNames = switch (event.getEventType()) {
            case WEDDING -> List.of("All Photos", "Wedding Ceremony", "Reception", "Candid Moments", "Couple Portraits", "Family & Friends");
            case ENGAGEMENT -> List.of("All Photos", "Ring Ceremony", "Portraits", "Celebrations");
            case RECEPTION -> List.of("All Photos", "Grand Entry", "Stage Moments", "Dinner & Dance");
            case BIRTHDAY, PARTY -> List.of("All Photos", "Cake Cutting", "Highlights", "Guests");
            case CORPORATE -> List.of("All Photos", "Keynotes", "Networking", "Awards");
            case OTHER -> List.of("All Photos", "Highlights", "Ceremony");
        };

        int order = 0;
        for (String name : albumNames) {
            Album album = new Album(event, name, name + " album", order, order == 0);
            event.addAlbum(album);
            order++;
        }
        albumRepository.saveAll(event.getAlbums());
    }
}
