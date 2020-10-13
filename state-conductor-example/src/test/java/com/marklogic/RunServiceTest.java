package com.marklogic;

import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.client.io.FileHandle;
import com.marklogic.ext.AbstractStateConductorRestTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.xml.namespace.QName;
import java.io.IOException;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

public class RunServiceTest extends AbstractStateConductorRestTest {

  static FileHandle restTestFlow;

  @BeforeAll
  public static void setupSuite() throws IOException {
    restTestFlow = loadFileResource("flows/rest-test-flow5.asl.json");
  }

  @BeforeEach
  public void setup() throws IOException {
    // add flow docs
    DocumentWriteSet batch = getJobsManager().newWriteSet();
    DocumentMetadataHandle flowMeta = new DocumentMetadataHandle();
    flowMeta.getCollections().add("state-conductor-flow");
    batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-flow/rest-test-flow5.asl.json", flowMeta, restTestFlow);
    getContentManager().write(batch);

    // add data docs
    batch = getContentManager().newWriteSet();
    DocumentMetadataHandle docMeta = new DocumentMetadataHandle();
    docMeta.getCollections().add("test");
    batch.add("/test/doc1.json", docMeta, loadFileResource("data/doc1.json"));
    batch.add("/test/doc2.json", docMeta, loadFileResource("data/doc2.json"));
    getContentManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    clearTestJobs();
  }

  @Test
  public void testFindTargetsWithDefaults() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow5").
      get("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(2)).
      body(".", hasItem("/test/doc1.json")).
      body(".", hasItem("/test/doc2.json"));
  }

  @Test
  public void testFindTargetsWithBadParams() {
    // missing required flowName
    given().
      log().uri().
    when().
      get("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(400).
      contentType(ContentType.JSON);

    // bad flowName
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "non-existent-flow").
      get("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(404).
      contentType(ContentType.JSON);
  }

  @Test
  public void testFindTargetsWithOptions() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow5").
      queryParam("rs:includeAlreadyProcessed", "false").
      queryParam("rs:limit", 100).
      get("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(2)).
      body(".", hasItem("/test/doc1.json")).
      body(".", hasItem("/test/doc2.json"));

    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow5").
      queryParam("rs:includeAlreadyProcessed", "false").
      queryParam("rs:limit", 1).
      get("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1));
  }

  @Test
  public void testRunWithDefaults() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow5").
      put("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(201).
      contentType(ContentType.JSON).
      body("flowName", equalTo("rest-test-flow5")).
      body("total", equalTo(2)).
      body("jobs.size()", equalTo(2)).
      body("jobs", hasKey("/test/doc1.json")).
      body("jobs", hasKey("/test/doc2.json"));

    // make sure they were processed
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow5").
      get("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(0));

    // check again with the includeAlreadyProcessedFlag
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow5").
      queryParam("rs:includeAlreadyProcessed", "true").
      get("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(2)).
      body(".", hasItem("/test/doc1.json")).
      body(".", hasItem("/test/doc2.json"));
  }

  @Test
  public void testRunWithOptions() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow5").
      queryParam("rs:includeAlreadyProcessed", "false").
      queryParam("rs:limit", 100).
      put("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(201).
      contentType(ContentType.JSON).
      body("flowName", equalTo("rest-test-flow5")).
      body("total", equalTo(2)).
      body("jobs.size()", equalTo(2)).
      body("jobs", hasKey("/test/doc1.json")).
      body("jobs", hasKey("/test/doc2.json"));

    // shouldn't find any with includeAlreadyProcessed flag turn off
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow5").
      queryParam("rs:includeAlreadyProcessed", "false").
      queryParam("rs:limit", 100).
      put("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(201).
      contentType(ContentType.JSON).
      body("flowName", equalTo("rest-test-flow5")).
      body("total", equalTo(0)).
      body("jobs.size()", equalTo(0));

    // should find 2 with the includeAlreadyProcessed tag turn on
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow5").
      queryParam("rs:includeAlreadyProcessed", "true").
      queryParam("rs:limit", 100).
      put("/v1/resources/state-conductor-run").
    then().
      log().body().
      statusCode(201).
      contentType(ContentType.JSON).
      body("flowName", equalTo("rest-test-flow5")).
      body("total", equalTo(2)).
      body("jobs.size()", equalTo(2)).
      body("jobs", hasKey("/test/doc1.json")).
      body("jobs", hasKey("/test/doc2.json"));
  }
}
