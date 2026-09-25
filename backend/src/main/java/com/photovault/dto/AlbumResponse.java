package com.photovault.dto;

import com.photovault.entity.Album;

public record AlbumResponse(
    Long id,
    String name,
    String description,
    Integer displayOrder,
    Boolean isDefault
) {
    public static AlbumResponse fromEntity(Album album) {
        return new AlbumResponse(
            album.getId(),
            album.getName(),
            album.getDescription(),
            album.getDisplayOrder(),
            album.getIsDefault()
        );
    }
}
