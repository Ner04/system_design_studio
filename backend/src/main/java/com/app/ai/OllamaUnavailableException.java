package com.app.ai;

class OllamaUnavailableException extends RuntimeException {

  OllamaUnavailableException(String message) {
    super(message);
  }

  OllamaUnavailableException(String message, Throwable cause) {
    super(message, cause);
  }
}
