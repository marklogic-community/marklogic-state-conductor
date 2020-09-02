package com.marklogic.tests;

import com.fasterxml.jackson.databind.node.JsonNodeType;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marklogic.StateConductorService;
import com.marklogic.StateConductorServiceMock;
import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.ext.AbstractStateConductorTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class GetJobStatusTest extends AbstractStateConductorTest {

  static Logger logger = LoggerFactory.getLogger(GetJobStatusTest.class);

  StateConductorService mockService;
  StateConductorService service;

  @BeforeEach
  public void setup() throws IOException {
    // setup the service
    mockService = new StateConductorServiceMock();
    service = StateConductorService.on(getDatabaseClient());

    DocumentWriteSet batch;

    // replacement tokens
    Map<String, String> tokens = new HashMap<>();
    tokens.put("%DATABASE%", getContentDatabaseId());
    tokens.put("%MODULES%", getModulesDatabaseId());

    // add job docs
    batch = getJobsManager().newWriteSet();
    DocumentMetadataHandle jobMeta = new DocumentMetadataHandle();
    jobMeta.getCollections().addAll("stateConductorJob", "test");
    jobMeta.getPermissions().add("state-conductor-reader-role", DocumentMetadataHandle.Capability.READ);
    jobMeta.getPermissions().add("state-conductor-job-writer-role", DocumentMetadataHandle.Capability.UPDATE);
    batch.add("/test/stateConductorJob/job1.json", jobMeta, loadTokenizedResource("jobs/job1.json", tokens));
    batch.add("/test/stateConductorJob/job2.json", jobMeta, loadTokenizedResource("jobs/job2.json", tokens));
    batch.add("/test/stateConductorJob/job3.json", jobMeta, loadTokenizedResource("jobs/job3.json", tokens));
    batch.add("/test/stateConductorJob/job4.json", jobMeta, loadTokenizedResource("jobs/job4.json", tokens));
    batch.add("/test/stateConductorJob/job5.json", jobMeta, loadTokenizedResource("jobs/job5.json", tokens));
    getJobsManager().write(batch);

    // add flow docs
    DocumentMetadataHandle flowMeta = new DocumentMetadataHandle();
    flowMeta.getCollections().add("state-conductor-flow");
    batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-flow/test-flow.asl.json", flowMeta, loadFileResource("flows/test-flow.asl.json"));
    batch.add("/state-conductor-flow/test2-flow.asl.json", flowMeta, loadFileResource("flows/test2-flow.asl.json"));
    getContentManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    deleteCollections(getJobsDatabaseClient(), "test");
  }

  @Test
  public void testSimpleStatusMock() {
    ObjectNode resp = mockService.getFlowStatus(Arrays.stream(new String[]{"fake-flow"}), null, null, null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.get("fake-flow").getNodeType());
    assertEquals("fake-flow", resp.get("fake-flow").get("flowName").asText());
    assertEquals("", resp.get("fake-flow").get("totalPerStatus").asText());
    assertEquals("", resp.get("fake-flow").get("totalPerState").asText());
  }

  @Test
  public void testSimpleStatus() {
    ObjectNode resp = service.getFlowStatus(null, null, null, null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());

    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").getNodeType());
    assertEquals("test-flow", resp.get("test-flow").get("flowName").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("totalPerStatus").getNodeType());
    assertTrue(2 <= resp.get("test-flow").get("totalPerStatus").get("new").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("waiting").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerStatus").get("complete").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("totalPerState").getNodeType());
    assertTrue(1 == resp.get("test-flow").get("totalPerState").get("add-collection-1").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerState").get("add-collection-2").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerState").get("success").asInt());

    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").getNodeType());
    assertEquals("test2-flow", resp.get("test2-flow").get("flowName").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").get("totalPerStatus").getNodeType());
    assertTrue(0 <= resp.get("test2-flow").get("totalPerStatus").get("new").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerStatus").get("waiting").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerStatus").get("complete").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").get("totalPerState").getNodeType());
    assertTrue(0 == resp.get("test2-flow").get("totalPerState").get("add-collection").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerState").get("choose-wisely").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerState").get("success").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerState").get("failure").asInt());
  }

  @Test
  public void testDetailedStatus() {
    ObjectNode resp = service.getFlowStatus(null, null, null, true);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());

    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("detailedTotalPerStatus").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("detailedTotalPerStatus").get("new").getNodeType());
    assertTrue(0 == resp.get("test-flow").get("detailedTotalPerStatus").get("new").get("add-collection-1").asInt());
    assertTrue(0 == resp.get("test-flow").get("detailedTotalPerStatus").get("new").get("add-collection-2").asInt());
    assertTrue(0 == resp.get("test-flow").get("detailedTotalPerStatus").get("new").get("success").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("detailedTotalPerStatus").get("working").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("detailedTotalPerStatus").get("waiting").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("detailedTotalPerStatus").get("complete").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("detailedTotalPerStatus").get("failed").getNodeType());

    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").get("detailedTotalPerStatus").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").get("detailedTotalPerStatus").get("new").getNodeType());
    assertTrue(0 == resp.get("test2-flow").get("detailedTotalPerStatus").get("new").get("add-collection").asInt());
    assertTrue(0 == resp.get("test2-flow").get("detailedTotalPerStatus").get("new").get("choose-wisely").asInt());
    assertTrue(0 == resp.get("test2-flow").get("detailedTotalPerStatus").get("new").get("success").asInt());
    assertTrue(0 == resp.get("test2-flow").get("detailedTotalPerStatus").get("new").get("failure").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").get("detailedTotalPerStatus").get("working").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").get("detailedTotalPerStatus").get("waiting").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").get("detailedTotalPerStatus").get("complete").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").get("detailedTotalPerStatus").get("failed").getNodeType());
  }

  @Test
  public void testSpecificStatus() {
    ObjectNode resp = service.getFlowStatus(Arrays.stream(new String[]{"test-flow"}), null, null, null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").getNodeType());
    assertEquals("test-flow", resp.get("test-flow").get("flowName").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("totalPerStatus").getNodeType());
    assertTrue(2 <= resp.get("test-flow").get("totalPerStatus").get("new").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("waiting").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerStatus").get("complete").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("totalPerState").getNodeType());
    assertTrue(1 == resp.get("test-flow").get("totalPerState").get("add-collection-1").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerState").get("add-collection-2").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerState").get("success").asInt());

    assertNull(resp.get("test2-flow"));
  }

  @Test
  public void testSpecificStatus2() {
    ObjectNode resp = service.getFlowStatus(Arrays.stream(new String[]{"test2-flow"}), null, null, null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").getNodeType());
    assertEquals("test2-flow", resp.get("test2-flow").get("flowName").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").get("totalPerStatus").getNodeType());
    assertTrue(0 <= resp.get("test2-flow").get("totalPerStatus").get("new").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerStatus").get("waiting").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerStatus").get("complete").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-flow").get("totalPerState").getNodeType());
    assertTrue(0 == resp.get("test2-flow").get("totalPerState").get("add-collection").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerState").get("choose-wisely").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerState").get("success").asInt());
    assertTrue(0 == resp.get("test2-flow").get("totalPerState").get("failure").asInt());

    assertNull(resp.get("test-flow"));
  }

  @Test
  public void testTemporalFilter1() {
    ObjectNode resp = service.getFlowStatus(Arrays.stream(new String[]{"test-flow"}), "2020-03-30T13:59:00Z", null, null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").getNodeType());
    assertEquals("test-flow", resp.get("test-flow").get("flowName").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("totalPerStatus").getNodeType());
    assertTrue(1 <= resp.get("test-flow").get("totalPerStatus").get("new").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("waiting").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerStatus").get("complete").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("totalPerState").getNodeType());
    assertTrue(1 == resp.get("test-flow").get("totalPerState").get("add-collection-1").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerState").get("add-collection-2").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerState").get("success").asInt());
  }

  @Test
  public void testTemporalFilter2() {
    ObjectNode resp = service.getFlowStatus(Arrays.stream(new String[]{"test-flow"}), null, "2020-03-30T13:59:00Z", null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").getNodeType());
    assertEquals("test-flow", resp.get("test-flow").get("flowName").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("totalPerStatus").getNodeType());
    assertTrue(1 <= resp.get("test-flow").get("totalPerStatus").get("new").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("waiting").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("complete").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("totalPerState").getNodeType());
    assertTrue(0 == resp.get("test-flow").get("totalPerState").get("add-collection-1").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerState").get("add-collection-2").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerState").get("success").asInt());
  }

  @Test
  public void testTemporalFilter3() {
    ObjectNode resp = service.getFlowStatus(Arrays.stream(new String[]{"test-flow"}), "2020-03-30T15:19:00Z", "2020-03-30T15:21:00Z", null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").getNodeType());
    assertEquals("test-flow", resp.get("test-flow").get("flowName").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("totalPerStatus").getNodeType());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("new").asInt());
    assertTrue(1 == resp.get("test-flow").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("waiting").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("complete").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-flow").get("totalPerState").getNodeType());
    assertTrue(1 == resp.get("test-flow").get("totalPerState").get("add-collection-1").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerState").get("add-collection-2").asInt());
    assertTrue(0 == resp.get("test-flow").get("totalPerState").get("success").asInt());
  }
}
