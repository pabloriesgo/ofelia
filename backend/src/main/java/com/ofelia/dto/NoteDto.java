package com.ofelia.dto;

import java.time.Instant;
import java.time.LocalDate;

/**
 * {@code createdAt}/{@code updatedAt} are {@code null} for a note that has
 * not been persisted yet (see TECH_SPEC.md §4.4).
 */
public record NoteDto(
        LocalDate date,
        String content,
        Instant createdAt,
        Instant updatedAt
) {
}
