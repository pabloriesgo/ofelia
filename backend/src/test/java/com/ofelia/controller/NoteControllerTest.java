package com.ofelia.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ofelia.dto.NoteDto;
import com.ofelia.dto.NoteUpsertRequest;
import com.ofelia.service.NoteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NoteController.class)
class NoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private NoteService noteService;

    @Test
    void returnsNoteForDate() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 23);
        when(noteService.getNote(date)).thenReturn(new NoteDto(date, "Today's plan", null, null));

        mockMvc.perform(get("/api/notes/{date}", "2026-09-23"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-09-23"))
                .andExpect(jsonPath("$.content").value("Today's plan"));
    }

    @Test
    void upsertsNoteContentForDate() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 23);
        Instant now = Instant.parse("2026-09-23T09:00:00Z");
        when(noteService.upsertNote(date, "Updated content"))
                .thenReturn(new NoteDto(date, "Updated content", now, now));

        mockMvc.perform(put("/api/notes/{date}", "2026-09-23")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new NoteUpsertRequest("Updated content"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Updated content"));
    }

}
