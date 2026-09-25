package com.photovault.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Storage Service Interface (Storage Abstraction Layer)
 * 
 * In clean software architecture, we define an interface so our controllers
 * and business services do not care WHERE files are actually stored.
 * 
 * - Today: LocalStorageService saves files to disk (`../storage/uploads` and `../storage/thumbnails`).
 * - Tomorrow: An S3StorageService or R2StorageService can be plugged in without changing any controller code.
 */
public interface StorageService {

    /**
     * Initializes the storage directories or buckets.
     */
    void init();

    /**
     * Stores an uploaded original photo.
     * 
     * @param file The multipart file uploaded by the photographer
     * @param subDirectory Subfolder (e.g. event ID or 'uploads')
     * @param targetFilename Unique filename to prevent collisions
     * @return Relative storage path
     * @throws IOException If storage fails
     */
    String store(MultipartFile file, String subDirectory, String targetFilename) throws IOException;

    /**
     * Generates and stores a web-optimized thumbnail for fast gallery browsing.
     * 
     * @param originalPath The relative path of the original image
     * @param targetWidth Max pixel width for thumbnail (e.g. 600px)
     * @return Relative storage path of thumbnail
     * @throws IOException If thumbnail generation fails
     */
    String generateThumbnail(String originalPath, int targetWidth) throws IOException;

    /**
     * Loads a file as a Spring Resource for HTTP streaming or download.
     * 
     * @param relativePath Stored relative path
     * @return Spring Resource
     */
    Resource loadAsResource(String relativePath);

    /**
     * Deletes a file from storage.
     * 
     * @param relativePath Stored relative path
     * @return true if deleted, false otherwise
     */
    boolean delete(String relativePath);

    /**
     * Checks if the storage engine is healthy and writable.
     * 
     * @return Status string (e.g., 'READY', 'ERROR')
     */
    String checkStatus();
}
