package com.photovault.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA Entity representing a Photography Event / Private Gallery.
 */
@Entity
@Table(name = "events", indexes = {
    @Index(name = "idx_events_access_code", columnList = "access_code", unique = true)
})
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_name", nullable = false, length = 255)
    private String eventName;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private EventType eventType;

    @Column(name = "customer_name", nullable = false, length = 200)
    private String customerName;

    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @Column(name = "customer_phone", length = 50)
    private String customerPhone;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_image", length = 500)
    private String coverImage;

    @Column(name = "access_code", nullable = false, unique = true, length = 50)
    private String accessCode;

    @Column(name = "pin_code", length = 20)
    private String pinCode;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Column(name = "photo_count", nullable = false)
    private Integer photoCount = 0;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Album> albums = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Event() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.isActive == null) this.isActive = true;
        if (this.viewCount == null) this.viewCount = 0;
        if (this.photoCount == null) this.photoCount = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void addAlbum(Album album) {
        albums.add(album);
        album.setEvent(this);
    }

    public void removeAlbum(Album album) {
        albums.remove(album);
        album.setEvent(null);
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEventName() {
        return eventName;
    }

    public void setEventName(String eventName) {
        this.eventName = eventName;
    }

    public EventType getEventType() {
        return eventType;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public LocalDate getEventDate() {
        return eventDate;
    }

    public void setEventDate(LocalDate eventDate) {
        this.eventDate = eventDate;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCoverImage() {
        return coverImage;
    }

    public void setCoverImage(String coverImage) {
        this.coverImage = coverImage;
    }

    public String getAccessCode() {
        return accessCode;
    }

    public void setAccessCode(String accessCode) {
        this.accessCode = accessCode;
    }

    public String getPinCode() {
        return pinCode;
    }

    public void setPinCode(String pinCode) {
        this.pinCode = pinCode;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean active) {
        isActive = active;
    }

    public Integer getViewCount() {
        return viewCount;
    }

    public void setViewCount(Integer viewCount) {
        this.viewCount = viewCount;
    }

    public Integer getPhotoCount() {
        return photoCount;
    }

    public void setPhotoCount(Integer photoCount) {
        this.photoCount = photoCount;
    }

    public List<Album> getAlbums() {
        return albums;
    }

    public void setAlbums(List<Album> albums) {
        this.albums = albums;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
