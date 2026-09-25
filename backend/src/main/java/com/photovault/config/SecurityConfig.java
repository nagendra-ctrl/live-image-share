package com.photovault.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security Configuration.
 * 
 * Configures:
 * 1. Stateless session management (no HTTP sessions; JWT tokens used in Phase 3).
 * 2. Disabled CSRF (standard for stateless REST APIs).
 * 3. Public endpoints for health checks, gallery access, and development H2 console.
 * 4. BCryptPasswordEncoder bean for hashing photographer passwords securely.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt with default strength 10: industry-standard salted password hashing
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF since REST APIs use tokens rather than cookies
            .csrf(AbstractHttpConfigurer::disable)
            
            // Allow iframe display specifically for H2 console in development
            .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable))
            
            // Stateless session policy: Spring will never create an HttpSession
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/health/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/gallery/**").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                // In Phase 1, permit all API access for initial testing; authenticated rules are activated in Phase 3
                .anyRequest().permitAll()
            );

        return http.build();
    }
}
