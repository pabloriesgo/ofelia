package com.ofelia.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.lang.Nullable;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.net.URI;
import java.time.LocalDate;
import java.util.stream.Collectors;

/**
 * Shared error handling for all REST endpoints: every error is returned as an RFC 9457
 * {@link ProblemDetail} ({@code application/problem+json}) with {@code status}, {@code title},
 * {@code detail} and {@code instance} (the request path), per TECH_SPEC.md §4.4.
 * Exception messages and stack traces are never exposed to the client.
 */
@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    static final String GENERIC_ERROR_DETAIL = "An unexpected error occurred. Please try again later.";
    static final String UNREADABLE_BODY_DETAIL = "Request body is missing or is not valid JSON.";

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex, HttpHeaders headers,
                                                        HttpStatusCode status, WebRequest request) {
        String name = ex instanceof MethodArgumentTypeMismatchException matme ? matme.getName() : ex.getPropertyName();
        String detail = ex.getRequiredType() == LocalDate.class
                ? "Parameter '%s' must be a valid date in YYYY-MM-DD format.".formatted(name)
                : "Parameter '%s' has an invalid value.".formatted(name);
        return problem(HttpStatus.BAD_REQUEST, "Invalid request parameter", detail, headers, request);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers,
                                                                  HttpStatusCode status, WebRequest request) {
        String detail = ex.getBindingResult().getAllErrors().stream()
                .map(ApiExceptionHandler::describe)
                .sorted()
                .collect(Collectors.joining("; "));
        return problem(HttpStatus.BAD_REQUEST, "Validation failed", detail, headers, request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex, HttpHeaders headers,
                                                                  HttpStatusCode status, WebRequest request) {
        return problem(HttpStatus.BAD_REQUEST, "Malformed request body", UNREADABLE_BODY_DETAIL, headers, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpected(Exception ex, WebRequest request) {
        log.error("Unhandled exception processing {}", path(request), ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", GENERIC_ERROR_DETAIL,
                new HttpHeaders(), request);
    }

    private ResponseEntity<Object> problem(HttpStatus status, String title, String detail,
                                           HttpHeaders headers, WebRequest request) {
        ProblemDetail body = ProblemDetail.forStatusAndDetail(status, detail);
        body.setTitle(title);
        String path = path(request);
        if (path != null) {
            try {
                body.setInstance(URI.create(path));
            } catch (IllegalArgumentException ignored) {
                // Leave instance unset rather than fail error handling on an unusual raw path.
            }
        }
        return ResponseEntity.status(status).headers(headers).body(body);
    }

    @Nullable
    private static String path(WebRequest request) {
        return request instanceof ServletWebRequest swr ? swr.getRequest().getRequestURI() : null;
    }

    private static String describe(ObjectError error) {
        String message = error.getDefaultMessage() != null ? error.getDefaultMessage() : "is invalid";
        String target = error instanceof FieldError fe ? fe.getField() : error.getObjectName();
        return target + ": " + message;
    }
}
