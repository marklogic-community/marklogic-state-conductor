package com.marklogic;

import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.ext.AbstractStateConductorRestTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

public class DriverServiceTest extends AbstractStateConductorRestTest {

  Logger logger = LoggerFactory.getLogger(DriverServiceTest.class);

  LocalDateTime now;

  @BeforeEach
  public void setup() throws IOException {
    now = LocalDateTime.now();

    // add stateMachine docs
    DocumentMetadataHandle stateMachineMeta = new DocumentMetadataHandle();
    stateMachineMeta.getCollections().add("state-conductor-state-machine");
    DocumentWriteSet batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-state-machine/rest-test-state-machine3.asl.json", stateMachineMeta, loadFileResource("stateMachines/rest-test-state-machine3.asl.json"));
    batch.add("/state-conductor-state-machine/rest-test-state-machine4.asl.json", stateMachineMeta, loadFileResource("stateMachines/rest-test-state-machine4.asl.json"));
    getContentManager().write(batch);

    // add data docs
    batch = getContentManager().newWriteSet();
    batch.add("/test/doc1.json", loadFileResource("data/doc1.json"));
    batch.add("/test/doc2.json", loadFileResource("data/doc2.json"));
    getContentManager().write(batch);

    // replacement tokens
    Map<String, String> tokens = new HashMap<>();
    tokens.put("%DATABASE%", getContentDatabaseId());
    tokens.put("%MODULES%", getModulesDatabaseId());
    tokens.put("%DATE-NOW%", now.format(DateTimeFormatter.ISO_DATE_TIME));
    tokens.put("%DATE-YESTERDAY%", now.minusDays(1).format(DateTimeFormatter.ISO_DATE_TIME));
    tokens.put("%DATE-TOMORROW%", now.plusDays(1).format(DateTimeFormatter.ISO_DATE_TIME));

    // add execution docs
    batch = getExecutionsManager().newWriteSet();
    DocumentMetadataHandle executionMeta = new DocumentMetadataHandle();
    executionMeta.getCollections().add("stateConductorExecution");
    executionMeta.getPermissions().add("state-conductor-reader-role", DocumentMetadataHandle.Capability.READ);
    executionMeta.getPermissions().add("state-conductor-execution-writer-role", DocumentMetadataHandle.Capability.UPDATE);
    batch.add("/test/stateConductorExecution/execution4.json", executionMeta, loadTokenizedResource("executions/execution4.json", tokens));
    batch.add("/test/stateConductorExecution/execution5.json", executionMeta, loadTokenizedResource("executions/execution5.json", tokens));
    batch.add("/test/stateConductorExecution/execution6.json", executionMeta, loadTokenizedResource("executions/execution6.json", tokens));
    batch.add("/test/stateConductorExecution/execution7.json", executionMeta, loadTokenizedResource("executions/execution7.json", tokens));
    getExecutionsManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    clearTestExecutions();
  }

  @Test
  public void testListExecutionsDefault() {
    given().
      log().uri().
    when().
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", greaterThanOrEqualTo(4));
  }

  @Test
  public void testListExecutionsFilterByCount() {
    given().
      log().uri().
    when().
      queryParam("rs:count", 0).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", greaterThanOrEqualTo(4));

    given().
      log().uri().
    when().
      queryParam("rs:count", 1).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1));

    given().
      log().uri().
    when().
      queryParam("rs:count", 2).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(2));

    given().
      log().uri().
    when().
      queryParam("rs:count", 100).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", greaterThanOrEqualTo(4));
  }

  @Test
  public void testListExecutionsFilterByNames() {
    // list of names
    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(4));

    // individual name 1
    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3").
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(3));

    // individual name 2
    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine4").
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1));
  }

  @Test
  public void testListExecutionsFilterByStatus() {
    // list of status
    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:status", "new,working,waiting,complete,failed").
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(4));

    // individual status
    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:status", "new").
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(3)).
      body(".", hasItem("/test/stateConductorExecution/execution4.json")).
      body(".", hasItem("/test/stateConductorExecution/execution5.json")).
      body(".", hasItem("/test/stateConductorExecution/execution7.json"));

    // individual status
    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:status", "working").
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1)).
      body(".", hasItem("/test/stateConductorExecution/execution6.json"));
  }

  @Test
  public void testListExecutionsFilterByStart() {
    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:startDate", now.minusDays(1).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(4));

    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:startDate", now.format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(3)).
      body(".", hasItem("/test/stateConductorExecution/execution4.json")).
      body(".", hasItem("/test/stateConductorExecution/execution6.json")).
      body(".", hasItem("/test/stateConductorExecution/execution7.json"));

    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:startDate", now.plusDays(1).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1)).
      body(".", hasItem("/test/stateConductorExecution/execution6.json"));

    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:startDate", now.plusDays(2).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(0));
  }

  @Test
  public void testListExecutionsFilterByEnd() {
    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:endDate", now.plusDays(2).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(4));

    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:endDate", now.plusDays(1).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(4));

    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:endDate", now.format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(3)).
      body(".", hasItem("/test/stateConductorExecution/execution4.json")).
      body(".", hasItem("/test/stateConductorExecution/execution5.json")).
      body(".", hasItem("/test/stateConductorExecution/execution7.json"));

    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:endDate", now.minusDays(1).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1)).
      body(".", hasItem("/test/stateConductorExecution/execution5.json"));

    given().
      log().uri().
    when().
      queryParam("rs:names", "rest-test-state-machine3,rest-test-state-machine4").
      queryParam("rs:endDate", now.minusDays(2).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(0));
  }

  @Test
  public void testProcessExecution() {
    // start stateMachine
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorExecution/execution4.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // stateMachine step 1
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorExecution/execution4.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // stateMachine step 2
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorExecution/execution4.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // stateMachine step 3
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorExecution/execution4.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // stateMachine final step
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorExecution/execution4.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(false));
  }

  @Test
  public void testProcessExecution2() {
    // start stateMachine
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorExecution/execution7.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // stateMachine step 1
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorExecution/execution7.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // stateMachine step 2
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorExecution/execution7.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // stateMachine final step
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorExecution/execution7.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(false));
  }

  public void testProcessBadUri() {
    // TODO
  }

  @Test
  public void testProcessExecutionMissingUri() {
    given().
      log().uri().
    when().
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(400).
      contentType(ContentType.JSON);

    given().
      log().uri().
    when().
      queryParam("rs:uri", "").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(400).
      contentType(ContentType.JSON);
  }

}
