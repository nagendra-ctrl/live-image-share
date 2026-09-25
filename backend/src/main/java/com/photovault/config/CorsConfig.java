package com.photovault.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

/**
 * Cross-Origin Resource Sharing (CORS) Configuration.
 * 
 * Allows the React frontend running on Vite (http://localhost:5173)
 * to communicate seamlessly with this Spring Boot backend.
 */
@Configuration
public class CorsConfig {

    @Value("${photovault.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
    private String allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowCredentials(true);
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        config.setAllowedOriginPatterns(origins);
        config.addAllowedHeader("*");
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setExposedHeaders(Arrays.asList("Authorization", "Content-Disposition"));

        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
