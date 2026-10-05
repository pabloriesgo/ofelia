package com.ofelia.service;

import com.ofelia.dto.NoteDto;
import com.ofelia.entity.Note;
import com.ofelia.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository noteRepository;
    private final TransactionTemplate transactionTemplate;

    /**
     * Returns the note for the given date, or an empty/unsaved shape if none
     * exists yet — nothing is persisted by a read (TECH_SPEC.md §4.1).
     */
    public NoteDto getNote(LocalDate date) {
        return noteRepository.findByDate(date)
                .map(this::toDto)
                .orElseGet(() -> new NoteDto(date, "", null, null));
    }

    /**
     * Upserts the note's content for the given date (auto-save), creating
     * the row on first non-empty save (TECH_SPEC.md §4.1). An empty save for
     * a date with no row persists nothing (PRD story 2).
     */
    public NoteDto upsertNote(LocalDate date, String content) {
        try {
            return transactionTemplate.execute(status -> upsertInTransaction(date, content));
        } catch (DataIntegrityViolationException e) {
            // A concurrent first save for this date inserted the row after our lookup;
            // the failed transaction is rolled back, so retry in a fresh one, which updates it.
            return transactionTemplate.execute(status -> upsertInTransaction(date, content));
        }
    }

    private NoteDto upsertInTransaction(LocalDate date, String content) {
        Optional<Note> existing = noteRepository.findByDate(date);
        if (existing.isEmpty() && content.isEmpty()) {
            return new NoteDto(date, "", null, null);
        }
        Note note = existing.orElseGet(() -> {
            Note created = new Note();
            created.setDate(date);
            created.setCreatedAt(Instant.now());
            return created;
        });
        note.setContent(content);
        note.setUpdatedAt(Instant.now());
        return toDto(noteRepository.save(note));
    }

    private NoteDto toDto(Note note) {
        return new NoteDto(note.getDate(), note.getContent(), note.getCreatedAt(), note.getUpdatedAt());
    }

}
