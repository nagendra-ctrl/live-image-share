package com.photovault.dto;

import com.photovault.entity.EventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * Request payload for creating a new photography event.
 */
public record CreateEventRequest(
    @NotBlank(message = "Event name is required")
    String eventName,

    @NotNull(message = "Event type is required")
    EventType eventType,

    @NotBlank(message = "Customer name is required")
    String customerName,

    String customerEmail,
    String customerPhone,

    @NotNull(message = "Event date is required")
    LocalDate eventDate,

    String location,
    String description,
    String coverImage,
    String instagramHandle,
    String whatsappNumber
) {}
