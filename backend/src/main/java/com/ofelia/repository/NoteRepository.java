package com.ofelia.repository;

import com.ofelia.entity.Note;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface NoteRepository extends JpaRepository<Note, Long> {

    Optional<Note> findByDate(LocalDate date);

}
