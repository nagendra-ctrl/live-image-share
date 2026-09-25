package com.photovault.service;

import com.photovault.dto.CreateEventRequest;
import com.photovault.dto.EventResponse;
import com.photovault.dto.UpdateEventRequest;

import java.util.List;

public interface EventService {

    EventResponse createEvent(CreateEventRequest request);

    List<EventResponse> getAllEvents();

    EventResponse getEventById(Long id);

    EventResponse getEventByAccessCode(String accessCode);

    EventResponse updateEvent(Long id, UpdateEventRequest request);

    void deleteEvent(Long id);
}
