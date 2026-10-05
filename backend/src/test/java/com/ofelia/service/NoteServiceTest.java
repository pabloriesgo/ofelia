package com.ofelia.service;

import com.ofelia.dto.NoteDto;
import com.ofelia.entity.Note;
import com.ofelia.repository.NoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    @Mock
    private NoteRepository noteRepository;

    private NoteService noteService;

    @BeforeEach
    void setUp() {
        noteService = new NoteService(noteRepository, new TransactionTemplate(mock(PlatformTransactionManager.class)));
    }

    @Test
    void returnsExistingNoteWhenOnePersistedForTheDate() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        Note note = new Note();
        note.setDate(date);
        note.setContent("Existing content");
        note.setCreatedAt(Instant.parse("2026-09-23T08:00:00Z"));
        note.setUpdatedAt(Instant.parse("2026-09-23T09:00:00Z"));
        when(noteRepository.findByDate(date)).thenReturn(Optional.of(note));

        NoteDto result = noteService.getNote(date);

        assertThat(result).isEqualTo(new NoteDto(date, "Existing content",
                Instant.parse("2026-09-23T08:00:00Z"), Instant.parse("2026-09-23T09:00:00Z")));
    }

    @Test
    void returnsEmptyUnsavedNoteWhenNoneExistsForTheDate() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        when(noteRepository.findByDate(date)).thenReturn(Optional.empty());

        NoteDto result = noteService.getNote(date);

        assertThat(result).isEqualTo(new NoteDto(date, "", null, null));
    }

    @Test
    void createsANewNoteWhenNoneExistsForTheDate() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        when(noteRepository.findByDate(date)).thenReturn(Optional.empty());
        when(noteRepository.save(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteDto result = noteService.upsertNote(date, "New content");

        assertThat(result.date()).isEqualTo(date);
        assertThat(result.content()).isEqualTo("New content");
        assertThat(result.createdAt()).isNotNull();
        assertThat(result.updatedAt()).isNotNull();
    }

    @Test
    void updatesContentOfAnExistingNoteWithoutChangingItsCreatedAt() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        Instant originalCreatedAt = Instant.parse("2026-09-23T08:00:00Z");
        Note note = new Note();
        note.setDate(date);
        note.setContent("Old content");
        note.setCreatedAt(originalCreatedAt);
        note.setUpdatedAt(originalCreatedAt);
        when(noteRepository.findByDate(date)).thenReturn(Optional.of(note));
        when(noteRepository.save(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteDto result = noteService.upsertNote(date, "Updated content");

        assertThat(result.content()).isEqualTo("Updated content");
        assertThat(result.createdAt()).isEqualTo(originalCreatedAt);
        assertThat(result.updatedAt()).isAfter(originalCreatedAt);
    }

    @Test
    void doesNotPersistAnEmptySaveForADateWithNoNote() {
        LocalDate date = LocalDate.of(2026, 9, 24);
        when(noteRepository.findByDate(date)).thenReturn(Optional.empty());

        NoteDto result = noteService.upsertNote(date, "");

        assertThat(result).isEqualTo(new NoteDto(date, "", null, null));
        verify(noteRepository, never()).save(any(Note.class));
    }

    @Test
    void clearsTheContentOfAnExistingNote() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        Note note = new Note();
        note.setDate(date);
        note.setContent("Old content");
        note.setCreatedAt(Instant.parse("2026-09-23T08:00:00Z"));
        note.setUpdatedAt(Instant.parse("2026-09-23T08:00:00Z"));
        when(noteRepository.findByDate(date)).thenReturn(Optional.of(note));
        when(noteRepository.save(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteDto result = noteService.upsertNote(date, "");

        assertThat(result.content()).isEmpty();
        assertThat(result.createdAt()).isNotNull();
        verify(noteRepository).save(note);
    }

    @Test
    void retriesAsAnUpdateWhenAConcurrentFirstSaveInsertedTheNote() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        Instant concurrentCreatedAt = Instant.parse("2026-09-23T08:00:00Z");
        Note concurrentlyCreated = new Note();
        concurrentlyCreated.setDate(date);
        concurrentlyCreated.setContent("From the other request");
        concurrentlyCreated.setCreatedAt(concurrentCreatedAt);
        concurrentlyCreated.setUpdatedAt(concurrentCreatedAt);
        when(noteRepository.findByDate(date))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(concurrentlyCreated));
        when(noteRepository.save(any(Note.class)))
                .thenThrow(new DataIntegrityViolationException("uq_notes_date"))
                .thenAnswer(invocation -> invocation.getArgument(0));

        NoteDto result = noteService.upsertNote(date, "My content");

        assertThat(result.content()).isEqualTo("My content");
        assertThat(result.createdAt()).isEqualTo(concurrentCreatedAt);
        verify(noteRepository, times(2)).save(any(Note.class));
    }

}
