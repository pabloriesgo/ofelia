package com.ofelia.controller;

import com.ofelia.dto.NoteDto;
import com.ofelia.dto.NoteUpsertRequest;
import com.ofelia.service.NoteService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @Operation(summary = "Fetch the note for a date, or an empty/unsaved shape if none exists yet")
    @GetMapping("/{date}")
    public NoteDto getNote(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return noteService.getNote(date);
    }

    @Operation(summary = "Upsert the note's content for a date (auto-save)")
    @PutMapping("/{date}")
    public NoteDto upsertNote(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                               @Valid @RequestBody NoteUpsertRequest request) {
        return noteService.upsertNote(date, request.content());
    }

}
