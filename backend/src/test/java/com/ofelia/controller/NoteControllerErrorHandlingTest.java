package com.ofelia.controller;

import com.ofelia.service.NoteService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NoteController.class)
class NoteControllerErrorHandlingTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NoteService noteService;

    @ParameterizedTest
    @ValueSource(strings = {"not-a-date", "2026-02-31", "2026-13-01", "23-09-2026"})
    void getWithInvalidDateReturnsProblemDetail(String badDate) throws Exception {
        mockMvc.perform(get("/api/notes/{date}", badDate))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Invalid request parameter"))
                .andExpect(jsonPath("$.detail").value(allOf(containsString("'date'"), containsString("YYYY-MM-DD"))))
                .andExpect(jsonPath("$.instance").value("/api/notes/" + badDate));

        verifyNoInteractions(noteService);
    }

    @Test
    void putWithInvalidDateReturnsProblemDetail() throws Exception {
        mockMvc.perform(put("/api/notes/{date}", "2026-02-31")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"hi\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail").value(allOf(containsString("'date'"), containsString("YYYY-MM-DD"))))
                .andExpect(jsonPath("$.instance").value("/api/notes/2026-02-31"));

        verifyNoInteractions(noteService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"content\":null}"})
    void putWithMissingOrNullContentReturnsValidationProblem(String body) throws Exception {
        mockMvc.perform(put("/api/notes/{date}", "2026-09-23")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.detail").value("content: must not be null"))
                .andExpect(jsonPath("$.instance").value("/api/notes/2026-09-23"));

        verifyNoInteractions(noteService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"{bad", "", "[1,2]", "{\"content\":{\"nested\":true}}"})
    void putWithMalformedOrMissingBodyReturnsSafeProblem(String body) throws Exception {
        mockMvc.perform(put("/api/notes/{date}", "2026-09-23")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.title").value("Malformed request body"))
                .andExpect(jsonPath("$.detail").value(ApiExceptionHandler.UNREADABLE_BODY_DETAIL))
                .andExpect(jsonPath("$.instance").value("/api/notes/2026-09-23"))
                .andExpect(content().string(allOf(
                        not(containsString("jackson")),
                        not(containsString("JSON parse error")),
                        not(containsString("NoteUpsertRequest")))));

        verifyNoInteractions(noteService);
    }

    @Test
    void unexpectedServiceFailureOnGetReturnsGenericProblem() throws Exception {
        when(noteService.getNote(any(LocalDate.class)))
                .thenThrow(new IllegalStateException("db password=s3cret leaked"));

        mockMvc.perform(get("/api/notes/{date}", "2026-09-23"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.title").value("Internal Server Error"))
                .andExpect(jsonPath("$.detail").value(ApiExceptionHandler.GENERIC_ERROR_DETAIL))
                .andExpect(jsonPath("$.instance").value("/api/notes/2026-09-23"))
                .andExpect(content().string(allOf(
                        not(containsString("s3cret")),
                        not(containsString("IllegalStateException")),
                        not(containsString("at com.ofelia")))));
    }

    @Test
    void unexpectedServiceFailureOnPutReturnsGenericProblem() throws Exception {
        when(noteService.upsertNote(any(LocalDate.class), anyString()))
                .thenThrow(new RuntimeException("constraint xyz violated"));

        mockMvc.perform(put("/api/notes/{date}", "2026-09-23")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"hi\"}"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.detail").value(ApiExceptionHandler.GENERIC_ERROR_DETAIL))
                .andExpect(content().string(not(containsString("constraint xyz"))));
    }
}
