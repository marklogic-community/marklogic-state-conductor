package com.marklogic.stateconductor.exceptions;

import java.util.List;

public class CreateExecutionsTaskException extends Exception {
  protected List<String> targetUris;

  public CreateExecutionsTaskException(List<String> uris, Throwable cause) {
    super("CreateExecutionsTask error", cause);
    this.targetUris = uris;
  }

  public List<String> getTargetUris() {
    return targetUris;
  }
}
