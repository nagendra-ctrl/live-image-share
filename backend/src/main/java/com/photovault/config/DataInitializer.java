package com.photovault.config;

import com.photovault.dto.CreateEventRequest;
import com.photovault.entity.EventType;
import com.photovault.repository.EventRepository;
import com.photovault.service.EventService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;

/**
 * Seeds initial event data on first startup if no events exist.
 */
@Configuration
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final EventRepository eventRepository;
    private final EventService eventService;

    public DataInitializer(EventRepository eventRepository, EventService eventService) {
        this.eventRepository = eventRepository;
        this.eventService = eventService;
    }

    @Override
    public void run(String... args) {
        if (eventRepository.count() == 0) {
            log.info("Database is empty. Seeding initial event data...");

            CreateEventRequest event1 = new CreateEventRequest(
                "Wedding of Marcus & Sophia",
                EventType.WEDDING,
                "Marcus & Sophia Sterling",
                "sophia.marcus@example.com",
                "+1 (555) 234-5678",
                LocalDate.of(2026, 9, 15),
                "Villa Cetinale, Tuscany, Italy",
                "Intimate luxury Italian destination wedding with vineyard portraits and courtyard banquet.",
                "/wedding_couple_hero.jpg"
            );
            var res1 = eventService.createEvent(event1);
            // Ensure exact accessCode matching the reference screenshot
            eventRepository.findById(res1.id()).ifPresent(e -> {
                e.setAccessCode("WED-2026-8824");
                e.setPhotoCount(248);
                eventRepository.save(e);
            });

            CreateEventRequest event2 = new CreateEventRequest(
                "Verma & Kapoor Wedding Gala",
                EventType.RECEPTION,
                "Aarav & Meera Verma",
                "aarav.verma@example.com",
                "+91 98765 43210",
                LocalDate.of(2026, 12, 22),
                "The Leela Palace, Udaipur",
                "Royal heritage reception celebration with grand floral setup and live orchestral performances.",
                "/wedding_reception_dinner.jpg"
            );
            var res2 = eventService.createEvent(event2);
            eventRepository.findById(res2.id()).ifPresent(e -> {
                e.setAccessCode("WED-2026-4091");
                e.setPhotoCount(185);
                eventRepository.save(e);
            });

            log.info("Initial event seeding complete! Total events: {}", eventRepository.count());
        }
    }
}
