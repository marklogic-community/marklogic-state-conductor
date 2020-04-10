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

import javax.xml.namespace.QName;
import java.io.IOException;

import static io.restassured.RestAssured.*;
import static io.restassured.matcher.RestAssuredMatchers.*;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

public class JobsServiceTest extends AbstractStateConductorRestTest {

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

    // add data docs
    batch = getContentManager().newWriteSet();
    batch.add("/test/doc1.json", loadFileResource("data/doc1.json"));
    batch.add("/test/doc2.json", loadFileResource("data/doc2.json"));
    getContentManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    clearTestDatabase();
  }

  @Test
  public void testCreateJob() {
    Response resp = given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json").
      queryParam("rs:flowName", "rest-test-flow").
      put("/v1/resources/state-conductor-jobs").
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
  public void testCreateJobs() {
    Response resp = given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json,/test/doc2.json").
      queryParam("rs:flowName", "rest-test-flow2").
      put("/v1/resources/state-conductor-jobs").
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
  public void testCreateJobMissingUri() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow").
      put("/v1/resources/state-conductor-jobs").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testCreateJobInvalidUri() {
    given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc99999.json").
      queryParam("rs:flowName", "rest-test-flow").
      put("/v1/resources/state-conductor-jobs").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testCreateJobMissingFlowName() {
    given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json").
      put("/v1/resources/state-conductor-jobs").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testCreateJobBadFlowName() {
    given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json").
      queryParam("rs:flowName", "non-existent-flow").
      put("/v1/resources/state-conductor-jobs").
    then().
      log().body().
      statusCode(404);
  }

  @Test
  public void testGetJobId() {
    // no jobs yet
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc2.json").
      queryParam("rs:flowName", "rest-test-flow").
      get("/v1/resources/state-conductor-jobs").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(0));

    // create job
    Response resp = given().
      log().uri().
    when().
      queryParam("rs:uris", "/test/doc1.json").
      queryParam("rs:flowName", "rest-test-flow").
      put("/v1/resources/state-conductor-jobs").
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

    // get job id
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc1.json").
      queryParam("rs:flowName", "rest-test-flow").
      get("/v1/resources/state-conductor-jobs").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1)).
      body("[0]", equalTo(uuid));
  }

  @Test
  public void testGetJobIdMissingUri() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow").
      get("/v1/resources/state-conductor-jobs").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testGetJobIdInvalidUri() {
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc999999.json").
      queryParam("rs:flowName", "rest-test-flow").
      get("/v1/resources/state-conductor-jobs").
    then().
      log().body().
      statusCode(404);
  }

  @Test
  public void testGetJobIdMissingFlowName() {
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc1.json").
      get("/v1/resources/state-conductor-jobs").
    then().
      log().body().
      statusCode(400);
  }

  @Test
  public void testGetJobIdInvalidFlowName() {
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/doc1.json").
      queryParam("rs:flowName", "non-existent-flow").
      get("/v1/resources/state-conductor-jobs").
    then().
      log().body().
      statusCode(404);
  }

}
