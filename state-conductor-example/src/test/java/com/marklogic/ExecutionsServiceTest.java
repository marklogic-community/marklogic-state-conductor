package com.marklogic;

import com.fasterxml.jackson.databind.JsonNode;
import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.ext.AbstractStateConductorRestTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

public class ExecutionsServiceTest extends AbstractStateConductorRestTest {

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

    // add data docs
    batch = getContentManager().newWriteSet();
    batch.add("/test/doc1.json", loadFileResource("data/doc1.json"));
    batch.add("/test/doc2.json", loadFileResource("data/doc2.json"));
    batch.add("/test/doc3.json", loadFileResource("data/doc2.json"));
    getContentManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    clearTestExecutions();
  }

  @Test
  public void testCreateExecution() {
    Response resp = given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json").
      queryParam("rs:name", "rest-test-state-machine").
      put("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(201).
      contentType(ContentType.JSON).
    extract().
      response();

    JsonNode respObj = resp.as(JsonNode.class);
    assertTrue(respObj.has("/test/doc1.json"));

    String uuid = respObj.get("/test/doc1.json").asText();
    assertTrue(uuid.length() > 0);
  }

  @Test
  public void testCreateExecutions() {
    Response resp = given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json,/test/doc2.json").
      queryParam("rs:name", "rest-test-state-machine2").
      put("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(201).
      contentType(ContentType.JSON).
    extract().
      response();

    JsonNode respObj = resp.as(JsonNode.class);
    assertTrue(respObj.has("/test/doc1.json"));
    assertTrue(respObj.has("/test/doc2.json"));
    assertTrue(respObj.get("/test/doc1.json").toString().length() > 0);
    assertTrue(respObj.get("/test/doc2.json").toString().length() > 0);
  }

  @Test
  public void testCreateExecutionMissingUri() {
    given().
      log().uri().
    when().
      queryParam("rs:name", "rest-test-state-machine").
      put("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testCreateExecutionInvalidUri() {
    given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc99999.json").
      queryParam("rs:name", "rest-test-state-machine").
      put("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testCreateExecutionMissingStateMachineName() {
    given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json").
      put("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testCreateExecutionBadStateMachineName() {
    given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json").
      queryParam("rs:name", "non-existent-state-machine").
      put("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(404);
  }

  @Test
  public void testGetExecutionId() {
    // no executions yet
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc1.json").
      queryParam("rs:name", "rest-test-state-machine").
      queryParam("rs:full", false).
      get("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(0));

    // create execution
    Response resp = given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json").
      queryParam("rs:name", "rest-test-state-machine").
      put("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(201).
      contentType(ContentType.JSON).
    extract().
      response();

    JsonNode respObj = resp.as(JsonNode.class);
    assertTrue(respObj.has("/test/doc1.json"));
    String uuid = respObj.get("/test/doc1.json").asText();
    assertTrue(uuid.length() > 0);

    // get execution id
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc1.json").
      queryParam("rs:name", "rest-test-state-machine").
      queryParam("rs:full", false).
      get("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1)).
      body("[0]", equalTo(uuid));

    // create execution
    resp = given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json").
      queryParam("rs:name", "rest-test-state-machine2").
      put("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(201).
      contentType(ContentType.JSON).
    extract().
      response();

    String uuid2 = resp.as(JsonNode.class).get("/test/doc1.json").asText();

    // get both execution ids
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc1.json").
      queryParam("rs:full", false).
      get("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(2)).
      body(".", hasItem(uuid)).
      body(".", hasItem(uuid2));
  }

  @Test
  public void testGetExecutionIdMissingUri() {
    given().
      log().uri().
    when().
      queryParam("rs:name", "rest-test-state-machine").
      get("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testGetExecutionIdInvalidUri() {
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc999999.json").
      queryParam("rs:name", "rest-test-state-machine").
      get("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(404);
  }

  @Test
  public void testGetExecutionIdMissingStateMachineName() {
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc1.json").
      queryParam("rs:full", false).
      get("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(200);
  }

  @Test
  public void testGetExecutionIdInvalidStateMachineName() {
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc1.json").
      queryParam("rs:name", "non-existent-state-machine").
      get("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(404);
  }

  @Test
  public void getExecutionsByUri() {
    // no executions yet
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc3.json").
      queryParam("rs:full", true).
      get("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(0));

    // create execution
    Response resp = given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc3.json").
      queryParam("rs:name", "rest-test-state-machine").
      put("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(201).
      contentType(ContentType.JSON).
    extract().
      response();

    JsonNode respObj = resp.as(JsonNode.class);
    assertTrue(respObj.has("/test/doc3.json"));
    String uuid1 = respObj.get("/test/doc3.json").asText();
    assertTrue(uuid1.length() > 0);

    // create execution 2
    resp = given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc3.json").
      queryParam("rs:name", "rest-test-state-machine2").
      put("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(201).
      contentType(ContentType.JSON).
    extract().
      response();

    respObj = resp.as(JsonNode.class);
    assertTrue(respObj.has("/test/doc3.json"));
    String uuid2 = respObj.get("/test/doc3.json").asText();
    assertTrue(uuid2.length() > 0);

    // get both execution docs
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc3.json").
      queryParam("rs:full", true).
      get("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(2)).
      body("doc.name", hasItem("rest-test-state-machine")).
      body("doc.find { it.name == 'rest-test-state-machine' }.id", equalTo(uuid1)).
      body("doc.name", hasItem("rest-test-state-machine2")).
      body("doc.find { it.name == 'rest-test-state-machine2' }.id", equalTo(uuid2));

    // get single execution doc
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc3.json").
      queryParam("rs:full", true).
      queryParam("rs:name", "rest-test-state-machine").
      get("/v1/resources/state-conductor-executions").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1)).
      body("[0].doc.name", equalTo("rest-test-state-machine")).
      body("[0].doc.id", equalTo(uuid1));
  }

}
