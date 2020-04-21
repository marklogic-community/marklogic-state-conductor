package com.marklogic;

import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.client.io.FileHandle;
import com.marklogic.ext.AbstractStateConductorRestTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.FileNotFoundException;
import java.io.IOException;

import static io.restassured.RestAssured.*;
import static io.restassured.matcher.RestAssuredMatchers.*;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

public class FlowServiceTest extends AbstractStateConductorRestTest {

  Logger logger = LoggerFactory.getLogger(JobsServiceTest.class);

  @BeforeEach
  public void setup() throws IOException {
    // add flow docs
    DocumentMetadataHandle flowMeta = new DocumentMetadataHandle();
    flowMeta.getCollections().add("state-conductor-flow");
    DocumentWriteSet batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-flow/rest-test-flow.asl.json", flowMeta, loadFileResource("flows/rest-test-flow.asl.json"));
    batch.add("/state-conductor-flow/rest-test-flow2.asl.json", flowMeta, loadFileResource("flows/rest-test-flow2.asl.json"));
    getContentManager().write(batch);
  }

  @Test
  public void testListAllFlows() {
    given().
      log().uri().
    when().
      get("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("rest-test-flow", notNullValue()).
      body("rest-test-flow.StartAt", equalTo("add-collection-1")).
      body("rest-test-flow.States", notNullValue()).
      body("rest-test-flow2", notNullValue()).
      body("rest-test-flow2.StartAt", equalTo("test-data")).
      body("rest-test-flow2.States", notNullValue());
  }

  @Test
  public void testListNamedFlow() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow").
      get("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("StartAt", equalTo("add-collection-1")).
      body("States", notNullValue()).
      body("States.add-collection-1", notNullValue()).
      body("States.add-collection-2", notNullValue()).
      body("States.success", notNullValue());

    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow2").
      get("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("StartAt", equalTo("test-data")).
      body("States", notNullValue()).
      body("States.test-data", notNullValue()).
      body("States.success", notNullValue());
  }

  @Test
  public void testListInvalidNamedFlow() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "non-existent-flow").
      get("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(404).
      contentType(ContentType.JSON);
  }

  @Test
  public void testInsertFlow() throws FileNotFoundException {
    FileHandle fileHandle = loadFileResource("flows/rest-test-flow.asl.json");
    // insert a flow
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow3").
      contentType(ContentType.JSON).
      body(fileHandle.get()).
      put("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(201);
    // make sure it was inserted
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow3").
      get("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("StartAt", equalTo("add-collection-1")).
      body("States", notNullValue()).
      body("States.add-collection-1", notNullValue()).
      body("States.add-collection-2", notNullValue()).
      body("States.success", notNullValue());
  }

  @Test
  public void testInsertUnnamedFlow() throws FileNotFoundException {
    FileHandle fileHandle = loadFileResource("flows/rest-test-flow.asl.json");

    given().
      log().uri().
    when().
      queryParam("rs:flowName", "").
      contentType(ContentType.JSON).
      body(fileHandle.get()).
      put("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(400);

    given().
      log().uri().
    when().
      contentType(ContentType.JSON).
      body(fileHandle.get()).
      put("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testInsertMissingFlow() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow3").
      contentType(ContentType.JSON).
      put("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testInsertNonJsonFlow() throws FileNotFoundException {
    FileHandle fileHandle = loadFileResource("flows/rest-test-flow.asl.json");

    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow3").
      contentType(ContentType.TEXT).
      body(fileHandle.get()).
      put("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testInsertInvalidFlow() throws FileNotFoundException {
    FileHandle fileHandle = loadFileResource("flows/invalid-test-flow.asl.json");

    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow3").
      contentType(ContentType.JSON).
      body(fileHandle.get()).
    put("/v1/resources/state-conductor-flows").
      then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testDeleteFlow() throws FileNotFoundException {
    FileHandle fileHandle = loadFileResource("flows/rest-test-flow.asl.json");
    // insert a flow
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow3").
      contentType(ContentType.JSON).
      body(fileHandle.get()).
    put("/v1/resources/state-conductor-flows").
      then().
      log().body().
      statusCode(201);
    // make sure it was inserted
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow3").
      get("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("StartAt", equalTo("add-collection-1")).
      body("States", notNullValue());
    // delete it
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow3").
      contentType(ContentType.JSON).
      delete("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(204);
    // make sure it was deleted
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow3").
      get("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(404);
  }

  @Test
  public void testDeleteUnnamedFlow() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "").
      contentType(ContentType.JSON).
      delete("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(400);

    given().
      log().uri().
    when().
      contentType(ContentType.JSON).
      delete("/v1/resources/state-conductor-flows").
    then().
      log().body().
      statusCode(400);
  }

}
