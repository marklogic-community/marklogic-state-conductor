package com.marklogic.stateconductor.exceptions;

import java.util.List;

public class ProcessExecutionTaskException extends Exception {
  protected Long id;
  protected List<String> executionUris;

  public ProcessExecutionTaskException(Long id, List<String> uris, Throwable cause) {
    super("ProcessExecutionTask error", cause);
    this.id = id;
    this.executionUris = uris;
  }

  public Long getId() {
    return id;
  }

  public List<String> getExecutionUris() {
    return executionUris;
  }
}
