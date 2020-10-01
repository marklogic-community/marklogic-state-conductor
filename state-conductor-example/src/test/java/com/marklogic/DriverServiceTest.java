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

    // add flow docs
    DocumentMetadataHandle flowMeta = new DocumentMetadataHandle();
    flowMeta.getCollections().add("state-conductor-flow");
    DocumentWriteSet batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-flow/rest-test-flow3.asl.json", flowMeta, loadFileResource("flows/rest-test-flow3.asl.json"));
    batch.add("/state-conductor-flow/rest-test-flow4.asl.json", flowMeta, loadFileResource("flows/rest-test-flow4.asl.json"));
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

    // add job docs
    batch = getJobsManager().newWriteSet();
    DocumentMetadataHandle jobMeta = new DocumentMetadataHandle();
    jobMeta.getCollections().add("stateConductorJob");
    jobMeta.getPermissions().add("state-conductor-reader-role", DocumentMetadataHandle.Capability.READ);
    jobMeta.getPermissions().add("state-conductor-job-writer-role", DocumentMetadataHandle.Capability.UPDATE);
    batch.add("/test/stateConductorJob/job4.json", jobMeta, loadTokenizedResource("jobs/job4.json", tokens));
    batch.add("/test/stateConductorJob/job5.json", jobMeta, loadTokenizedResource("jobs/job5.json", tokens));
    batch.add("/test/stateConductorJob/job6.json", jobMeta, loadTokenizedResource("jobs/job6.json", tokens));
    batch.add("/test/stateConductorJob/job7.json", jobMeta, loadTokenizedResource("jobs/job7.json", tokens));
    batch.add("/test/stateConductorJob/jobTimeOut.json", jobMeta, loadTokenizedResource("jobs/jobTimeOut.json", tokens));
    getJobsManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    clearTestJobs();
  }

  @Test
  public void testListJobsDefault() {
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
  public void testListJobsFilterByCount() {
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
  public void testListJobsFilterByNames() {
    // list of names
    given().
      log().uri().
    when().
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
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
      queryParam("rs:flowNames", "rest-test-flow3").
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
      queryParam("rs:flowNames", "rest-test-flow4").
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1));
  }

  @Test
  public void testListJobsFilterByStatus() {
    // list of status
    given().
      log().uri().
    when().
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
      queryParam("rs:flowStatus", "new,working,waiting,complete,failed").
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
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
      queryParam("rs:flowStatus", "new").
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(3)).
      body(".", hasItem("/test/stateConductorJob/job4.json")).
      body(".", hasItem("/test/stateConductorJob/job5.json")).
      body(".", hasItem("/test/stateConductorJob/job7.json"));

    // individual status
    given().
      log().uri().
    when().
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
      queryParam("rs:flowStatus", "working").
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1)).
      body(".", hasItem("/test/stateConductorJob/job6.json"));
  }

  @Test
  public void testListJobsFilterByStart() {
    given().
      log().uri().
    when().
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
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
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
      queryParam("rs:startDate", now.format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(3)).
      body(".", hasItem("/test/stateConductorJob/job4.json")).
      body(".", hasItem("/test/stateConductorJob/job6.json")).
      body(".", hasItem("/test/stateConductorJob/job7.json"));

    given().
      log().uri().
    when().
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
      queryParam("rs:startDate", now.plusDays(1).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1)).
      body(".", hasItem("/test/stateConductorJob/job6.json"));

    given().
      log().uri().
    when().
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
      queryParam("rs:startDate", now.plusDays(2).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(0));
  }

  @Test
  public void testListJobsFilterByEnd() {
    given().
      log().uri().
    when().
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
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
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
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
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
      queryParam("rs:endDate", now.format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(3)).
      body(".", hasItem("/test/stateConductorJob/job4.json")).
      body(".", hasItem("/test/stateConductorJob/job5.json")).
      body(".", hasItem("/test/stateConductorJob/job7.json"));

    given().
      log().uri().
    when().
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
      queryParam("rs:endDate", now.minusDays(1).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(1)).
      body(".", hasItem("/test/stateConductorJob/job5.json"));

    given().
      log().uri().
    when().
      queryParam("rs:flowNames", "rest-test-flow3,rest-test-flow4").
      queryParam("rs:endDate", now.minusDays(2).format(DateTimeFormatter.ISO_DATE_TIME)).
      get("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("size()", equalTo(0));
  }

  @Test
  public void testProcessJob() {
    // start flow
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorJob/job4.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // flow step 1
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorJob/job4.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // flow step 2
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorJob/job4.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // flow step 3
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorJob/job4.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // flow final step
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorJob/job4.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(false));
  }

  @Test
  public void testProcessJob2() {
    // start flow
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorJob/job7.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // flow step 1
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorJob/job7.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // flow step 2
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorJob/job7.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));
    // flow final step
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorJob/job7.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(200).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(false));
  }


@Test
  public void testProcessJobTimeOut() {
    // start flow
    given().
      log().uri().
    when().
      queryParam("rs:uri", "/test/stateConductorJob/jobTimeOut.json").
      put("/v1/resources/state-conductor-driver").
    then().
      log().body().
      statusCode(500).
      contentType(ContentType.JSON).
      body("reschedule", equalTo(true));

  }


  public void testProcessBadUri() {
    // TODO
  }

  @Test
  public void testProcessJobMissingUri() {
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
