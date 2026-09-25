package com.photovault.dto;

import java.time.Instant;
import java.util.Map;

/**
 * Modern Java 21 Record representing health status response.
 * 
 * In Java 21, a 'record' is a concise way to create immutable data carriers.
 * It automatically generates constructor, getters, equals(), hashCode(), and toString().
 */
public record HealthResponse(
    String status,
    String service,
    String version,
    String javaVersion,
    String activeProfile,
    String database,
    String storage,
    long uptimeMs,
    Map<String, Object> systemMetrics,
    Instant timestamp
) {}
