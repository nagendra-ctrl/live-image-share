package com.photovault.entity;

/**
 * Supported event types for PhotoVault events.
 */
public enum EventType {
    WEDDING("Wedding", "WED"),
    ENGAGEMENT("Engagement", "ENG"),
    RECEPTION("Reception", "REC"),
    BIRTHDAY("Birthday", "BDY"),
    PARTY("Party", "PTY"),
    CORPORATE("Corporate Event", "CORP"),
    OTHER("Other Function", "EVT");

    private final String displayName;
    private final String codePrefix;

    EventType(String displayName, String codePrefix) {
        this.displayName = displayName;
        this.codePrefix = codePrefix;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getCodePrefix() {
        return codePrefix;
    }
}
