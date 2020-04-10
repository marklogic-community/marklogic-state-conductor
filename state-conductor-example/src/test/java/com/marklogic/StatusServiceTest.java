package com.marklogic;

import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.client.io.FileHandle;
import com.marklogic.client.io.StringHandle;
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

  static FileHandle job1;
  static FileHandle job2;
  static FileHandle job3;
  static FileHandle restTestFlow;
  static FileHandle restTestFlow2;

  LocalDateTime now;

  @BeforeAll
  public static void setupSuite() throws IOException {
    job1 = loadFileResource("jobs/job1.json");
    job2 = loadFileResource("jobs/job2.json");
    job3 = loadFileResource("jobs/job3.json");
    restTestFlow = loadFileResource("flows/rest-test-flow.asl.json");
    restTestFlow2 = loadFileResource("flows/rest-test-flow2.asl.json");
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

    // add job docs
    DocumentWriteSet batch = getJobsManager().newWriteSet();
    DocumentMetadataHandle jobMeta = new DocumentMetadataHandle();
    jobMeta.getCollections().add("stateConductorJob");
    jobMeta.getPermissions().add("state-conductor-reader-role", DocumentMetadataHandle.Capability.READ);
    jobMeta.getPermissions().add("state-conductor-job-writer-role", DocumentMetadataHandle.Capability.UPDATE);
    batch.add("/test/stateConductorJob/job1.json", jobMeta, replaceTokensInResource(job1, tokens));
    batch.add("/test/stateConductorJob/job2.json", jobMeta, replaceTokensInResource(job2, tokens));
    batch.add("/test/stateConductorJob/job3.json", jobMeta, replaceTokensInResource(job3, tokens));
    getJobsManager().write(batch);

    // add flow docs
    DocumentMetadataHandle flowMeta = new DocumentMetadataHandle();
    flowMeta.getCollections().add("state-conductor-flow");
    batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-flow/rest-test-flow.asl.json", flowMeta, restTestFlow);
    batch.add("/state-conductor-flow/rest-test-flow2.asl.json", flowMeta, restTestFlow2);
    getContentManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    clearTestJobs();
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
      body("rest-test-flow", notNullValue()).
      body("rest-test-flow.flowName", equalTo("rest-test-flow")).
      body("rest-test-flow.working", notNullValue()).
      body("rest-test-flow.working.add-collection-1", greaterThanOrEqualTo(0)).
      body("rest-test-flow.working.add-collection-2", greaterThanOrEqualTo(0)).
      body("rest-test-flow.working.success", greaterThanOrEqualTo(0)).
      body("rest-test-flow.complete", notNullValue()).
      body("rest-test-flow.complete.add-collection-1", greaterThanOrEqualTo(0)).
      body("rest-test-flow.complete.add-collection-2", greaterThanOrEqualTo(0)).
      body("rest-test-flow.complete.success", greaterThanOrEqualTo(0)).
      body("rest-test-flow2", notNullValue()).
      body("rest-test-flow2.flowName", equalTo("rest-test-flow2")).
      body("rest-test-flow2.working", notNullValue()).
      body("rest-test-flow2.working.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-flow2.working.success", greaterThanOrEqualTo(0)).
      body("rest-test-flow2.complete", notNullValue()).
      body("rest-test-flow2.complete.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-flow2.complete.success", greaterThanOrEqualTo(0));
  }

  @Test
  public void testFlowNameParam() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow").
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("rest-test-flow", notNullValue()).
      body("rest-test-flow.flowName", equalTo("rest-test-flow")).
      body("rest-test-flow.working", notNullValue()).
      body("rest-test-flow.working.add-collection-1", greaterThanOrEqualTo(0)).
      body("rest-test-flow.working.add-collection-2", greaterThanOrEqualTo(0)).
      body("rest-test-flow.working.success", greaterThanOrEqualTo(0)).
      body("rest-test-flow.complete", notNullValue()).
      body("rest-test-flow.complete.add-collection-1", greaterThanOrEqualTo(0)).
      body("rest-test-flow.complete.add-collection-2", greaterThanOrEqualTo(0)).
      body("rest-test-flow.complete.success", greaterThanOrEqualTo(0));
  }

  @Test
  public void testFlowName2Param() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow2").
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("rest-test-flow2", notNullValue()).
      body("rest-test-flow2.flowName", equalTo("rest-test-flow2")).
      body("rest-test-flow2.working", notNullValue()).
      body("rest-test-flow2.working.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-flow2.working.success", greaterThanOrEqualTo(0)).
      body("rest-test-flow2.complete", notNullValue()).
      body("rest-test-flow2.complete.test-data", greaterThanOrEqualTo(0)).
      body("rest-test-flow2.complete.success", greaterThanOrEqualTo(0));
  }

  @Test
  public void testTemporalParam() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "rest-test-flow").
      queryParam("rs:startDate", now.minusHours(1).format(DateTimeFormatter.ISO_DATE_TIME)).
      queryParam("rs:endDate", now.plusHours(1).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-status").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("rest-test-flow", notNullValue()).
      body("rest-test-flow.flowName", equalTo("rest-test-flow")).
      body("rest-test-flow.totalComplete", equalTo(0)).
      body("rest-test-flow.totalWorking", equalTo(1)).
      body("rest-test-flow.totalFailed", equalTo(0)).
      body("rest-test-flow.totalNew", greaterThanOrEqualTo(1)).
      body("rest-test-flow.working", notNullValue()).
      body("rest-test-flow.working.add-collection-1", equalTo(1)).
      body("rest-test-flow.working.add-collection-2", equalTo(0)).
      body("rest-test-flow.working.success", equalTo(0)).
      body("rest-test-flow.complete", notNullValue()).
      body("rest-test-flow.complete.add-collection-1", equalTo(0)).
      body("rest-test-flow.complete.add-collection-2", equalTo(0)).
      body("rest-test-flow.complete.success", equalTo(0));
  }

  @Test
  public void testBadFlowName() {
    given().
      log().uri().
    when().
      queryParam("rs:flowName", "non-existent-flow").
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
