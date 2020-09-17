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

public class GetExecutionStatusTest extends AbstractStateConductorTest {

  static Logger logger = LoggerFactory.getLogger(GetExecutionStatusTest.class);

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

    // add execution docs
    batch = getExecutionsManager().newWriteSet();
    DocumentMetadataHandle executionMeta = new DocumentMetadataHandle();
    executionMeta.getCollections().addAll("stateConductorExecution", "test");
    executionMeta.getPermissions().add("state-conductor-reader-role", DocumentMetadataHandle.Capability.READ);
    executionMeta.getPermissions().add("state-conductor-execution-writer-role", DocumentMetadataHandle.Capability.UPDATE);
    batch.add("/test/stateConductorExecution/execution1.json", executionMeta, loadTokenizedResource("executions/execution1.json", tokens));
    batch.add("/test/stateConductorExecution/execution2.json", executionMeta, loadTokenizedResource("executions/execution2.json", tokens));
    batch.add("/test/stateConductorExecution/execution3.json", executionMeta, loadTokenizedResource("executions/execution3.json", tokens));
    batch.add("/test/stateConductorExecution/execution4.json", executionMeta, loadTokenizedResource("executions/execution4.json", tokens));
    batch.add("/test/stateConductorExecution/execution5.json", executionMeta, loadTokenizedResource("executions/execution5.json", tokens));
    getExecutionsManager().write(batch);

    // add stateMachine docs
    DocumentMetadataHandle stateMachineMeta = new DocumentMetadataHandle();
    stateMachineMeta.getCollections().add("state-conductor-state-machine");
    batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-state-machine/test-state-machine.asl.json", stateMachineMeta, loadFileResource("stateMachines/test-state-machine.asl.json"));
    batch.add("/state-conductor-state-machine/test2-state-machine.asl.json", stateMachineMeta, loadFileResource("stateMachines/test2-state-machine.asl.json"));
    getContentManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    deleteCollections(getExecutionsDatabaseClient(), "test");
  }

  @Test
  public void testSimpleStatusMock() {
    ObjectNode resp = mockService.getStateMachineStatus(Arrays.stream(new String[]{"fake-state-machine"}), null, null, null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.get("fake-state-machine").getNodeType());
    assertEquals("fake-state-machine", resp.get("fake-state-machine").get("name").asText());
    assertEquals("", resp.get("fake-state-machine").get("totalPerStatus").asText());
    assertEquals("", resp.get("fake-state-machine").get("totalPerState").asText());
  }

  @Test
  public void testSimpleStatus() {
    ObjectNode resp = service.getStateMachineStatus(null, null, null, null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());

    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").getNodeType());
    assertEquals("test-state-machine", resp.get("test-state-machine").get("name").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("totalPerStatus").getNodeType());
    assertTrue(2 <= resp.get("test-state-machine").get("totalPerStatus").get("new").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("waiting").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerStatus").get("complete").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("totalPerState").getNodeType());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerState").get("add-collection-1").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerState").get("add-collection-2").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerState").get("success").asInt());

    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").getNodeType());
    assertEquals("test2-state-machine", resp.get("test2-state-machine").get("name").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").get("totalPerStatus").getNodeType());
    assertTrue(0 <= resp.get("test2-state-machine").get("totalPerStatus").get("new").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerStatus").get("waiting").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerStatus").get("complete").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").get("totalPerState").getNodeType());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerState").get("add-collection").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerState").get("choose-wisely").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerState").get("success").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerState").get("failure").asInt());
  }

  @Test
  public void testDetailedStatus() {
    ObjectNode resp = service.getStateMachineStatus(null, null, null, true);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());

    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("detailedTotalPerStatus").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("detailedTotalPerStatus").get("new").getNodeType());
    assertTrue(0 == resp.get("test-state-machine").get("detailedTotalPerStatus").get("new").get("add-collection-1").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("detailedTotalPerStatus").get("new").get("add-collection-2").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("detailedTotalPerStatus").get("new").get("success").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("detailedTotalPerStatus").get("working").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("detailedTotalPerStatus").get("waiting").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("detailedTotalPerStatus").get("complete").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("detailedTotalPerStatus").get("failed").getNodeType());

    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").get("detailedTotalPerStatus").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").get("detailedTotalPerStatus").get("new").getNodeType());
    assertTrue(0 == resp.get("test2-state-machine").get("detailedTotalPerStatus").get("new").get("add-collection").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("detailedTotalPerStatus").get("new").get("choose-wisely").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("detailedTotalPerStatus").get("new").get("success").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("detailedTotalPerStatus").get("new").get("failure").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").get("detailedTotalPerStatus").get("working").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").get("detailedTotalPerStatus").get("waiting").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").get("detailedTotalPerStatus").get("complete").getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").get("detailedTotalPerStatus").get("failed").getNodeType());
  }

  @Test
  public void testSpecificStatus() {
    ObjectNode resp = service.getStateMachineStatus(Arrays.stream(new String[]{"test-state-machine"}), null, null, null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").getNodeType());
    assertEquals("test-state-machine", resp.get("test-state-machine").get("name").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("totalPerStatus").getNodeType());
    assertTrue(2 <= resp.get("test-state-machine").get("totalPerStatus").get("new").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("waiting").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerStatus").get("complete").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("totalPerState").getNodeType());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerState").get("add-collection-1").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerState").get("add-collection-2").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerState").get("success").asInt());

    assertNull(resp.get("test2-state-machine"));
  }

  @Test
  public void testSpecificStatus2() {
    ObjectNode resp = service.getStateMachineStatus(Arrays.stream(new String[]{"test2-state-machine"}), null, null, null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").getNodeType());
    assertEquals("test2-state-machine", resp.get("test2-state-machine").get("name").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").get("totalPerStatus").getNodeType());
    assertTrue(0 <= resp.get("test2-state-machine").get("totalPerStatus").get("new").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerStatus").get("waiting").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerStatus").get("complete").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test2-state-machine").get("totalPerState").getNodeType());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerState").get("add-collection").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerState").get("choose-wisely").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerState").get("success").asInt());
    assertTrue(0 == resp.get("test2-state-machine").get("totalPerState").get("failure").asInt());

    assertNull(resp.get("test-state-machine"));
  }

  @Test
  public void testTemporalFilter1() {
    ObjectNode resp = service.getStateMachineStatus(Arrays.stream(new String[]{"test-state-machine"}), "2020-03-30T13:59:00Z", null, null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").getNodeType());
    assertEquals("test-state-machine", resp.get("test-state-machine").get("name").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("totalPerStatus").getNodeType());
    assertTrue(1 <= resp.get("test-state-machine").get("totalPerStatus").get("new").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("waiting").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerStatus").get("complete").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("totalPerState").getNodeType());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerState").get("add-collection-1").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerState").get("add-collection-2").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerState").get("success").asInt());
  }

  @Test
  public void testTemporalFilter2() {
    ObjectNode resp = service.getStateMachineStatus(Arrays.stream(new String[]{"test-state-machine"}), null, "2020-03-30T13:59:00Z", null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").getNodeType());
    assertEquals("test-state-machine", resp.get("test-state-machine").get("name").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("totalPerStatus").getNodeType());
    assertTrue(1 <= resp.get("test-state-machine").get("totalPerStatus").get("new").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("waiting").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("complete").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("totalPerState").getNodeType());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerState").get("add-collection-1").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerState").get("add-collection-2").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerState").get("success").asInt());
  }

  @Test
  public void testTemporalFilter3() {
    ObjectNode resp = service.getStateMachineStatus(Arrays.stream(new String[]{"test-state-machine"}), "2020-03-30T15:19:00Z", "2020-03-30T15:21:00Z", null);
    logger.info(resp.toString());

    assertNotNull(resp);
    assertEquals(JsonNodeType.OBJECT, resp.getNodeType());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").getNodeType());
    assertEquals("test-state-machine", resp.get("test-state-machine").get("name").asText());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("totalPerStatus").getNodeType());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("new").asInt());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerStatus").get("working").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("waiting").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("complete").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerStatus").get("failed").asInt());
    assertEquals(JsonNodeType.OBJECT, resp.get("test-state-machine").get("totalPerState").getNodeType());
    assertTrue(1 == resp.get("test-state-machine").get("totalPerState").get("add-collection-1").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerState").get("add-collection-2").asInt());
    assertTrue(0 == resp.get("test-state-machine").get("totalPerState").get("success").asInt());
  }
}
