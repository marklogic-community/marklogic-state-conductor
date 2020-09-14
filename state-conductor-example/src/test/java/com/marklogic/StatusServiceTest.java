package com.marklogic;

import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.client.io.FileHandle;
import com.marklogic.ext.AbstractStateConductorRestTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

public class StatusServiceTest extends AbstractStateConductorRestTest {

  static FileHandle execution1;
  static FileHandle execution2;
  static FileHandle execution3;
  static FileHandle restTestStateMachine;
  static FileHandle restTestStateMachine2;

  LocalDateTime now;

  @BeforeAll
  public static void setupSuite() throws IOException {
    execution1 = loadFileResource("executions/execution1.json");
    execution2 = loadFileResource("executions/execution2.json");
    execution3 = loadFileResource("executions/execution3.json");
    restTestStateMachine = loadFileResource("stateMachines/rest-test-state-machine.asl.json");
    restTestStateMachine2 = loadFileResource("stateMachines/rest-test-state-machine2.asl.json");
  }

  @BeforeEach
  public void setup() throws IOException {
    now = LocalDateTime.now();

    // replacement tokens
    Map<String, String> tokens = new HashMap<>();
    tokens.put("%DATABASE%", getContentDatabaseId());
    tokens.put("%MODULES%", getModulesDatabaseId());
    tokens.put("%DATE-NOW%", now.format(DateTimeFormatter.ISO_DATE_TIME));
    tokens.put("%DATE-YESTERDAY%", now.minusDays(1).format(DateTimeFormatter.ISO_DATE_TIME));

    // add execution docs
    DocumentWriteSet batch = getExecutionsManager().newWriteSet();
    DocumentMetadataHandle executionMeta = new DocumentMetadataHandle();
    executionMeta.getCollections().add("stateConductorExecution");
    executionMeta.getPermissions().add("state-conductor-reader-role", DocumentMetadataHandle.Capability.READ);
    executionMeta.getPermissions().add("state-conductor-execution-writer-role", DocumentMetadataHandle.Capability.UPDATE);
    batch.add("/test/stateConductorExecution/execution1.json", executionMeta, replaceTokensInResource(execution1, tokens));
    batch.add("/test/stateConductorExecution/execution2.json", executionMeta, replaceTokensInResource(execution2, tokens));
    batch.add("/test/stateConductorExecution/execution3.json", executionMeta, replaceTokensInResource(execution3, tokens));
    getExecutionsManager().write(batch);

    // add stateMachine docs
    DocumentMetadataHandle stateMachineMeta = new DocumentMetadataHandle();
    stateMachineMeta.getCollections().add("state-conductor-state-machine");
    batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-state-machine/rest-test-state-machine.asl.json", stateMachineMeta, restTestStateMachine);
    batch.add("/state-conductor-state-machine/rest-test-state-machine2.asl.json", stateMachineMeta, restTestStateMachine2);
    getContentManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    clearTestExecutions();
  }

  @Test
  public void testServiceAccessible() {
    given().
    when().
      get("/v1/resources/state-conductor-status").
    then().
      statusCode(200).
      contentType(ContentType.JSON);
  }

  @Test
  public void testNoQueryParams() {
    given().
    when().
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("rest-test-state-machine", notNullValue()).
      body("rest-test-state-machine.stateMachineName", equalTo("rest-test-state-machine")).
      body("rest-test-state-machine.totalPerStatus", notNullValue()).
      body("rest-test-state-machine.totalPerStatus.new", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerStatus.working", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerStatus.waiting", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerStatus.complete", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerStatus.failed", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerState", notNullValue()).
      body("rest-test-state-machine.totalPerState.add-collection-1", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerState.add-collection-2", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerState.success", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2", notNullValue()).
      body("rest-test-state-machine2.stateMachineName", equalTo("rest-test-state-machine2")).
      body("rest-test-state-machine2.totalPerStatus", notNullValue()).
      body("rest-test-state-machine2.totalPerStatus.new", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.working", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.waiting", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.complete", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.failed", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerState", notNullValue()).
      body("rest-test-state-machine2.totalPerState.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerState.success", greaterThanOrEqualTo(0));
  }

  @Test
  public void testStateMachineNameParam() {
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine").
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("rest-test-state-machine", notNullValue()).
      body("rest-test-state-machine.stateMachineName", equalTo("rest-test-state-machine")).
      body("rest-test-state-machine.totalPerStatus", notNullValue()).
      body("rest-test-state-machine.totalPerStatus.new", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerStatus.working", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerStatus.waiting", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerStatus.complete", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerStatus.failed", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerState", notNullValue()).
      body("rest-test-state-machine.totalPerState.add-collection-1", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerState.add-collection-2", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine.totalPerState.success", greaterThanOrEqualTo(0));
  }

  @Test
  public void testStateMachineName2Param() {
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine2").
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("rest-test-state-machine2", notNullValue()).
      body("rest-test-state-machine2.stateMachineName", equalTo("rest-test-state-machine2")).
      body("rest-test-state-machine2.totalPerStatus", notNullValue()).
      body("rest-test-state-machine2.totalPerStatus.new", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.working", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.waiting", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.complete", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.failed", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerState", notNullValue()).
      body("rest-test-state-machine2.totalPerState.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerState.success", greaterThanOrEqualTo(0));
  }

  @Test
  public void testTemporalParam() {
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine").
      queryParam("rs:startDate", now.minusHours(1).format(DateTimeFormatter.ISO_DATE_TIME)).
      queryParam("rs:endDate", now.plusHours(1).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("rest-test-state-machine", notNullValue()).
      body("rest-test-state-machine.stateMachineName", equalTo("rest-test-state-machine")).
      body("rest-test-state-machine.totalPerStatus", notNullValue()).
      body("rest-test-state-machine.totalPerStatus.complete", equalTo(0)).
      body("rest-test-state-machine.totalPerStatus.working", equalTo(1)).
      body("rest-test-state-machine.totalPerStatus.failed", equalTo(0)).
      body("rest-test-state-machine.totalPerStatus.new", greaterThanOrEqualTo(1)).
      body("rest-test-state-machine.totalPerState", notNullValue()).
      body("rest-test-state-machine.totalPerState.add-collection-1", equalTo(1)).
      body("rest-test-state-machine.totalPerState.add-collection-2", equalTo(0)).
      body("rest-test-state-machine.totalPerState.success", equalTo(0));
  }

  @Test
  public void testDetailedParam() {
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "rest-test-state-machine2").
      queryParam("rs:detailed", true).
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("rest-test-state-machine2", notNullValue()).
      body("rest-test-state-machine2.stateMachineName", equalTo("rest-test-state-machine2")).
      body("rest-test-state-machine2.totalPerStatus", notNullValue()).
      body("rest-test-state-machine2.totalPerStatus.complete", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.working", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.failed", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerStatus.new", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerState", notNullValue()).
      body("rest-test-state-machine2.totalPerState.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.totalPerState.success", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.detailedTotalPerStatus", notNullValue()).
      body("rest-test-state-machine2.detailedTotalPerStatus.new", notNullValue()).
      body("rest-test-state-machine2.detailedTotalPerStatus.new.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.detailedTotalPerStatus.new.success", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.detailedTotalPerStatus.working", notNullValue()).
      body("rest-test-state-machine2.detailedTotalPerStatus.working.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.detailedTotalPerStatus.working.success", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.detailedTotalPerStatus.waiting", notNullValue()).
      body("rest-test-state-machine2.detailedTotalPerStatus.waiting.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.detailedTotalPerStatus.waiting.success", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.detailedTotalPerStatus.complete", notNullValue()).
      body("rest-test-state-machine2.detailedTotalPerStatus.complete.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.detailedTotalPerStatus.complete.success", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.detailedTotalPerStatus.failed", notNullValue()).
      body("rest-test-state-machine2.detailedTotalPerStatus.failed.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-state-machine2.detailedTotalPerStatus.failed.success", greaterThanOrEqualTo(0));
  }

  @Test
  public void testBadStateMachineName() {
    given().
      log().uri().
    when().
      queryParam("rs:stateMachineName", "non-existent-state-machine").
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(404);
  }

  @Test
  public void testBadTemporalParam() {
    // both bad
    given().
      log().uri().
    when().
      queryParam("rs:startDate", "123456").
      queryParam("rs:endDate", "abcdefg").
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(400);

    // bad endDate
    given().
      log().uri().
    when().
      queryParam("rs:startDate", now.format(DateTimeFormatter.ISO_DATE_TIME)).
      queryParam("rs:endDate", "abcdefg").
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(400);

    // bad startDate
    given().
      log().uri().
    when().
      queryParam("rs:startDate", "123456").
      queryParam("rs:endDate", now.format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(400);
  }
}
