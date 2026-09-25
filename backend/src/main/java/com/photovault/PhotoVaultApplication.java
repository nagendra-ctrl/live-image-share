package com.photovault;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.env.Environment;

import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * Main application bootstrap class for PhotoVault.
 * 
 * In Spring Boot, the @SpringBootApplication annotation enables:
 * 1. @Configuration: Tags the class as a source of bean definitions.
 * 2. @EnableAutoConfiguration: Automatically configures Spring based on jar dependencies.
 * 3. @ComponentScan: Automatically scans packages for @Component, @Service, @Repository, and @Controller classes.
 */
@SpringBootApplication
public class PhotoVaultApplication {

    private static final Logger log = LoggerFactory.getLogger(PhotoVaultApplication.class);

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(PhotoVaultApplication.class);
        Environment env = app.run(args).getEnvironment();
        logApplicationStartup(env);
    }

    private static void logApplicationStartup(Environment env) {
        String protocol = "http";
        String serverPort = env.getProperty("server.port", "8080");
        String hostAddress = "localhost";
        try {
            hostAddress = InetAddress.getLocalHost().getHostAddress();
        } catch (UnknownHostException e) {
            log.warn("The host name could not be determined, using `localhost` as fallback");
        }

        log.info("""
                \n----------------------------------------------------------
                \tApplication '{}' is running! Access URLs:
                \tLocal: \t\t{}://localhost:{}
                \tExternal: \t{}://{}:{}
                \tAPI Health: \t{}://localhost:{}/api/health
                \tProfile(s): \t{}
                ----------------------------------------------------------""",
                env.getProperty("spring.application.name"),
                protocol, serverPort,
                protocol, hostAddress, serverPort,
                protocol, serverPort,
                env.getActiveProfiles().length == 0 ? "default" : String.join(", ", env.getActiveProfiles()));
    }
}
