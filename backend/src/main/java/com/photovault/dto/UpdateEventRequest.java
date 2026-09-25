package com.photovault.dto;

import com.photovault.entity.EventType;
import java.time.LocalDate;

public record UpdateEventRequest(
    String eventName,
    EventType eventType,
    String customerName,
    String customerEmail,
    String customerPhone,
    LocalDate eventDate,
    String location,
    String description,
    String coverImage,
    Boolean isActive
) {}
