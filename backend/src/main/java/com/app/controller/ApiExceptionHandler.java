package com.app.controller;

import com.app.dto.ApiErrorResponse;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(EntityNotFoundException.class)
  public ResponseEntity<ApiErrorResponse> handleNotFound(EntityNotFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorResponse.of(exception.getMessage()));
  }

  @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
  public ResponseEntity<ApiErrorResponse> handleBadRequest(Exception exception) {
    return ResponseEntity.badRequest().body(ApiErrorResponse.of(exception.getMessage()));
  }
}
