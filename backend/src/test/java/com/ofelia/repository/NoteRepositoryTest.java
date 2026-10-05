package com.ofelia.repository;

import com.ofelia.entity.Note;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("local")
class NoteRepositoryTest {

    @Autowired
    private NoteRepository noteRepository;

    @Test
    void findsPersistedNoteByDate() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        Note note = new Note();
        note.setDate(date);
        note.setContent("Some content");
        note.setCreatedAt(Instant.now());
        note.setUpdatedAt(Instant.now());
        noteRepository.save(note);

        Optional<Note> found = noteRepository.findByDate(date);

        assertThat(found).isPresent();
        assertThat(found.get().getContent()).isEqualTo("Some content");
    }

    @Test
    void returnsEmptyWhenNoNoteForDate() {
        Optional<Note> found = noteRepository.findByDate(LocalDate.of(2099, 1, 1));

        assertThat(found).isEmpty();
    }

}
