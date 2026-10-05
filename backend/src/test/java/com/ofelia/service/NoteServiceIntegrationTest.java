package com.ofelia.service;

import com.ofelia.dto.NoteDto;
import com.ofelia.entity.Note;
import com.ofelia.repository.NoteRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doReturn;

@SpringBootTest
@ActiveProfiles("local")
class NoteServiceIntegrationTest {

    @Autowired
    private NoteService noteService;

    @SpyBean
    private NoteRepository noteRepository;

    @AfterEach
    void cleanUp() {
        noteRepository.deleteAll();
    }

    @Test
    void updatesTheNoteWhenAConcurrentFirstSaveInsertedItAfterTheLookup() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        Note concurrentlyCreated = new Note();
        concurrentlyCreated.setDate(date);
        concurrentlyCreated.setContent("From the other request");
        concurrentlyCreated.setCreatedAt(Instant.parse("2026-09-23T08:00:00Z"));
        concurrentlyCreated.setUpdatedAt(Instant.parse("2026-09-23T08:00:00Z"));
        Note persisted = noteRepository.save(concurrentlyCreated);
        // The first lookup misses the row, as it would if the other request committed just after it.
        doReturn(Optional.empty()).doReturn(Optional.of(persisted)).when(noteRepository).findByDate(date);

        NoteDto result = noteService.upsertNote(date, "My content");

        assertThat(result.content()).isEqualTo("My content");
        assertThat(noteRepository.findAll())
                .singleElement()
                .extracting(Note::getContent)
                .isEqualTo("My content");
    }

}
