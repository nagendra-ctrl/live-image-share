package com.photovault.dto;

import com.photovault.entity.Event;
import com.photovault.entity.EventType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record EventResponse(
    Long id,
    String eventName,
    EventType eventType,
    String customerName,
    String customerEmail,
    String customerPhone,
    LocalDate eventDate,
    String location,
    String description,
    String coverImage,
    String accessCode,
    Boolean isActive,
    Integer viewCount,
    Integer photoCount,
    Integer albumCount,
    List<AlbumResponse> albums,
    Instant createdAt,
    Instant updatedAt
) {
    public static EventResponse fromEntity(Event event) {
        List<AlbumResponse> albumResponses = event.getAlbums() != null
            ? event.getAlbums().stream().map(AlbumResponse::fromEntity).toList()
            : List.of();

        return new EventResponse(
            event.getId(),
            event.getEventName(),
            event.getEventType(),
            event.getCustomerName(),
            event.getCustomerEmail(),
            event.getCustomerPhone(),
            event.getEventDate(),
            event.getLocation(),
            event.getDescription(),
            event.getCoverImage(),
            event.getAccessCode(),
            event.getIsActive(),
            event.getViewCount(),
            event.getPhotoCount(),
            albumResponses.size(),
            albumResponses,
            event.getCreatedAt(),
            event.getUpdatedAt()
        );
    }
}
