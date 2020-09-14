package com.marklogic;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.Arrays;

public class StateConductorExecution {

  private String id;
  private String name;
  private String status;
  private String state;
  private String uri;
  private String database;
  private String modules;
  private String createdDate;
  private JsonNode context;
  private JsonNode[] provenance;
  private JsonNode errors;
  private JsonNode retries;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getStateMachineName() {
    return name;
  }

  public void setStateMachineName(String name) {
    this.name = name;
  }

  public String getStateMachineStatus() {
    return status;
  }

  public void setStateMachineStatus(String status) {
    this.status = status;
  }

  public String getStateMachineState() {
    return state;
  }

  public void setStateMachineState(String state) {
    this.state = state;
  }

  public String getUri() {
    return uri;
  }

  public void setUri(String uri) {
    this.uri = uri;
  }

  public String getDatabase() {
    return database;
  }

  public void setDatabase(String database) {
    this.database = database;
  }

  public String getModules() {
    return modules;
  }

  public void setModules(String modules) {
    this.modules = modules;
  }

  public String getCreatedDate() {
    return createdDate;
  }

  public void setCreatedDate(String createdDate) {
    this.createdDate = createdDate;
  }

  public JsonNode getContext() {
    return context;
  }

  public void setContext(JsonNode context) {
    this.context = context;
  }

  public JsonNode[] getProvenance() {
    return provenance;
  }

  public void setProvenance(JsonNode[] provenance) {
    this.provenance = provenance;
  }

  public JsonNode getErrors() {
    return errors;
  }

  public void setErrors(JsonNode errors) {
    this.errors = errors;
  }

  public JsonNode getRetries() {
    return retries;
  }

  public void setRetries(JsonNode retries) {
    this.retries = retries;
  }

  @Override
  public String toString() {
    return "StateConductorExecution{" +
      "id='" + id + '\'' +
      ", name='" + name + '\'' +
      ", status='" + status + '\'' +
      ", state='" + state + '\'' +
      ", uri='" + uri + '\'' +
      ", database='" + database + '\'' +
      ", modules='" + modules + '\'' +
      ", createdDate='" + createdDate + '\'' +
      ", context=" + context +
      ", provenance=" + Arrays.toString(provenance) +
      ", errors=" + errors +
      ", retries=" + retries +
      '}';
  }
}
