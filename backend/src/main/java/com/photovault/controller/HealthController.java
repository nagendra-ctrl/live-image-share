package com.photovault.controller;

import com.photovault.dto.HealthResponse;
import com.photovault.service.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * REST Controller for System Health and Diagnostics.
 * 
 * In Spring Boot:
 * - @RestController marks this class as a request handler where every method returns a domain object instead of a view.
 * - @RequestMapping("/api/health") defines the base URL path.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final StorageService storageService;
    private final Environment environment;

    @Autowired(required = false)
    private DataSource dataSource;

    @Value("${spring.application.name:PhotoVault}")
    private String applicationName;

    public HealthController(StorageService storageService, Environment environment) {
        this.storageService = storageService;
        this.environment = environment;
    }

    @GetMapping
    public ResponseEntity<HealthResponse> checkHealth() {
        String dbStatus = checkDatabaseConnection();
        String storageStatus = storageService.checkStatus();
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("availableProcessors", Runtime.getRuntime().availableProcessors());
        metrics.put("freeMemoryMb", Runtime.getRuntime().freeMemory() / (1024 * 1024));
        metrics.put("totalMemoryMb", Runtime.getRuntime().totalMemory() / (1024 * 1024));
        metrics.put("osName", System.getProperty("os.name"));

        String[] activeProfiles = environment.getActiveProfiles();
        String profile = activeProfiles.length > 0 ? String.join(", ", activeProfiles) : "default";

        HealthResponse response = new HealthResponse(
            "UP",
            applicationName,
            "1.0.0-PHASE1",
            System.getProperty("java.version"),
            profile,
            dbStatus,
            storageStatus,
            uptimeMs,
            metrics,
            Instant.now()
        );

        return ResponseEntity.ok(response);
    }

    private String checkDatabaseConnection() {
        if (dataSource == null) {
            return "STANDBY";
        }
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(2) ? "CONNECTED (" + connection.getMetaData().getDatabaseProductName() + ")" : "UNAVAILABLE";
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }
}
