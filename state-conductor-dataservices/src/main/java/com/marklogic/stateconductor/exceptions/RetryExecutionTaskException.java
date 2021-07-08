package com.marklogic.stateconductor.exceptions;

public class RetryExecutionTaskException extends Exception {
  protected Integer attempts;
  protected String executionUri;

  public RetryExecutionTaskException(String uri, Integer attempts, Throwable cause) {
    super("RetryExecutionTask error", cause);
    this.attempts = attempts;
    this.executionUri = uri;
  }

  public Integer getAttempts() {
    return attempts;
  }

  public String getExecutionUri() {
    return executionUri;
  }
}
