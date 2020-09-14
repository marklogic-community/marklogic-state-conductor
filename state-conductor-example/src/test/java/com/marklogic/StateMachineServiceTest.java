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
import static org.hamcrest.Matchers.*;

public class StateMachineServiceTest extends AbstractStateConductorRestTest {

  Logger logger = LoggerFactory.getLogger(ExecutionsServiceTest.class);

  @BeforeEach
  public void setup() throws IOException {
    // add stateMachine docs
    DocumentMetadataHandle stateMachineMeta = new DocumentMetadataHandle();
    stateMachineMeta.getCollections().add("state-conductor-state-machine");
    DocumentWriteSet batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-state-machine/rest-test-state-machine.asl.json", stateMachineMeta, loadFileResource("stateMachines/rest-test-state-machine.asl.json"));
    batch.add("/state-conductor-state-machine/rest-test-state-machine2.asl.json", stateMachineMeta, loadFileResource("stateMachines/rest-test-state-machine2.asl.json"));
    getContentManager().write(batch);
  }

  @Test
  public void testListAllStateMachines() {
    given().
      log().uri().
    when().
      get("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("rest-test-state-machine", notNullValue()).
      body("rest-test-state-machine.StartAt", equalTo("add-collection-1")).
      body("rest-test-state-machine.States", notNullValue()).
      body("rest-test-state-machine2", notNullValue()).
      body("rest-test-state-machine2.StartAt", equalTo("test-data")).
      body("rest-test-state-machine2.States", notNullValue());
  }

  @Test
  public void testListNamedStateMachine() {
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine").
      get("/v1/resources/state-conductor-state-machines").
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
      queryParam("rs:stateMachineName", "rest-test-state-machine2").
      get("/v1/resources/state-conductor-state-machines").
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
  public void testListInvalidNamedStateMachine() {
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "non-existent-state-machine").
      get("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(404).
      contentType(ContentType.JSON);
  }

  @Test
  public void testInsertStateMachine() throws FileNotFoundException {
    FileHandle fileHandle = loadFileResource("stateMachines/rest-test-state-machine.asl.json");
    // insert a stateMachine
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine3").
      contentType(ContentType.JSON).
      body(fileHandle.get()).
      put("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(201);
    // make sure it was inserted
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine3").
      get("/v1/resources/state-conductor-state-machines").
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
  public void testInsertUnnamedStateMachine() throws FileNotFoundException {
    FileHandle fileHandle = loadFileResource("stateMachines/rest-test-state-machine.asl.json");

    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "").
      contentType(ContentType.JSON).
      body(fileHandle.get()).
      put("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(400);

    given().
      log().uri().
    when().
      contentType(ContentType.JSON).
      body(fileHandle.get()).
      put("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testInsertMissingStateMachine() {
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine3").
      contentType(ContentType.JSON).
      put("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testInsertNonJsonStateMachine() throws FileNotFoundException {
    FileHandle fileHandle = loadFileResource("stateMachines/rest-test-state-machine.asl.json");

    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine3").
      contentType(ContentType.TEXT).
      body(fileHandle.get()).
      put("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testInsertInvalidStateMachine() throws FileNotFoundException {
    FileHandle fileHandle = loadFileResource("stateMachines/invalid-test-state-machine.asl.json");

    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine3").
      contentType(ContentType.JSON).
      body(fileHandle.get()).
    put("/v1/resources/state-conductor-state-machines").
      then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testDeleteStateMachine() throws FileNotFoundException {
    FileHandle fileHandle = loadFileResource("stateMachines/rest-test-state-machine.asl.json");
    // insert a stateMachine
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine3").
      contentType(ContentType.JSON).
      body(fileHandle.get()).
    put("/v1/resources/state-conductor-state-machines").
      then().
      log().body().
      statusCode(201);
    // make sure it was inserted
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine3").
      get("/v1/resources/state-conductor-state-machines").
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
      queryParam("rs:stateMachineName", "rest-test-state-machine3").
      contentType(ContentType.JSON).
      delete("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(204);
    // make sure it was deleted
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine3").
      get("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(404);
  }

  @Test
  public void testDeleteUnnamedStateMachine() {
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "").
      contentType(ContentType.JSON).
      delete("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(400);

    given().
      log().uri().
    when().
      contentType(ContentType.JSON).
      delete("/v1/resources/state-conductor-state-machines").
    then().
      log().body().
      statusCode(400);
  }

}
