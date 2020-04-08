package com.marklogic;

import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.ext.AbstractStateConductorRestTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;

import java.io.IOException;

import static io.restassured.RestAssured.*;
import static io.restassured.matcher.RestAssuredMatchers.*;
import static org.hamcrest.Matchers.*;

public class StatusServiceTest extends AbstractStateConductorRestTest {

  @BeforeEach
  public void setup() throws IOException {
    // add flow docs
    DocumentMetadataHandle flowMeta = new DocumentMetadataHandle();
    flowMeta.getCollections().add("state-conductor-flow");
    DocumentWriteSet batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-flow/test-flow.asl.json", flowMeta, loadFileResource("flows/test-flow.asl.json"));
    getContentManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    clearTestDatabase();
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
      body("test-flow", notNullValue()).
      body("test-flow.flowName", equalTo("test-flow")).
      body("test-flow.working", notNullValue()).
      body("test-flow.working.add-collection-1", greaterThanOrEqualTo(0)).
      body("test-flow.working.add-collection-2", greaterThanOrEqualTo(0)).
      body("test-flow.working.success", greaterThanOrEqualTo(0)).
      body("test-flow.complete", notNullValue()).
      body("test-flow.complete.add-collection-1", greaterThanOrEqualTo(0)).
      body("test-flow.complete.add-collection-2", greaterThanOrEqualTo(0)).
      body("test-flow.complete.success", greaterThanOrEqualTo(0));
  }

}
