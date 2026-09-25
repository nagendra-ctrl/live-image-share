package com.photovault.service;

import jakarta.annotation.PostConstruct;
import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * Local filesystem implementation of StorageService.
 * 
 * In a development or on-premise environment, this stores original photos
 * and generated thumbnails inside the configured storage folder.
 * 
 * It automatically creates:
 * - {storageRoot}/uploads
 * - {storageRoot}/thumbnails
 */
@Service
public class LocalStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);

    private final Path rootLocation;
    private final Path uploadsLocation;
    private final Path thumbnailsLocation;

    public LocalStorageService(@Value("${photovault.storage.location:../storage}") String storagePath) {
        this.rootLocation = Paths.get(storagePath).toAbsolutePath().normalize();
        this.uploadsLocation = this.rootLocation.resolve("uploads");
        this.thumbnailsLocation = this.rootLocation.resolve("thumbnails");
    }

    @PostConstruct
    @Override
    public void init() {
        try {
            Files.createDirectories(uploadsLocation);
            Files.createDirectories(thumbnailsLocation);
            log.info("PhotoVault storage initialized at: {}", rootLocation);
        } catch (IOException e) {
            log.error("Could not initialize storage directory: {}", rootLocation, e);
            throw new RuntimeException("Could not initialize storage directory", e);
        }
    }

    @Override
    public String store(MultipartFile file, String subDirectory, String targetFilename) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file.");
        }

        Path targetDir = uploadsLocation.resolve(subDirectory).normalize();
        Files.createDirectories(targetDir);

        Path destinationFile = targetDir.resolve(targetFilename).normalize();

        // Security check: ensure file path cannot escape intended directory (path traversal protection)
        if (!destinationFile.startsWith(uploadsLocation)) {
            throw new SecurityException("Cannot store file outside target directory.");
        }

        Files.copy(file.getInputStream(), destinationFile, StandardCopyOption.REPLACE_EXISTING);

        // Return relative path from uploads folder
        return uploadsLocation.relativize(destinationFile).toString().replace('\\', '/');
    }

    @Override
    public String generateThumbnail(String relativeOriginalPath, int targetWidth) throws IOException {
        Path originalFile = uploadsLocation.resolve(relativeOriginalPath).normalize();
        if (!Files.exists(originalFile)) {
            throw new IllegalArgumentException("Original file not found: " + relativeOriginalPath);
        }

        Path destinationThumb = thumbnailsLocation.resolve(relativeOriginalPath).normalize();
        Files.createDirectories(destinationThumb.getParent());

        // Use Thumbnailator to create high-quality, lightweight preview image
        Thumbnails.of(originalFile.toFile())
                .width(targetWidth)
                .outputQuality(0.85)
                .toFile(destinationThumb.toFile());

        return thumbnailsLocation.relativize(destinationThumb).toString().replace('\\', '/');
    }

    @Override
    public Resource loadAsResource(String relativePath) {
        try {
            Path file = rootLocation.resolve(relativePath).normalize();
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Could not read file: " + relativePath);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Error reading file: " + relativePath, e);
        }
    }

    @Override
    public boolean delete(String relativePath) {
        try {
            Path file = rootLocation.resolve(relativePath).normalize();
            return Files.deleteIfExists(file);
        } catch (IOException e) {
            log.error("Failed to delete file: {}", relativePath, e);
            return false;
        }
    }

    @Override
    public String checkStatus() {
        if (Files.exists(rootLocation) && Files.isWritable(rootLocation)) {
            return "READY (" + rootLocation.getFileName() + ")";
        }
        return "DEGRADED (Path not writable)";
    }
}
