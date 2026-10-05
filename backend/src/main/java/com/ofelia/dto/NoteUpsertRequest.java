package com.ofelia.dto;

import jakarta.validation.constraints.NotNull;

public record NoteUpsertRequest(
        @NotNull String content
) {
}
