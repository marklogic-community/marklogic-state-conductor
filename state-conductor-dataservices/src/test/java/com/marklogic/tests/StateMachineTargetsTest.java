package com.marklogic.tests;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeType;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marklogic.StateConductorExecution;
import com.marklogic.StateConductorService;
import com.marklogic.StateConductorServiceMock;
import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.client.io.FileHandle;
import com.marklogic.ext.AbstractStateConductorTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class StateMachineTargetsTest extends AbstractStateConductorTest {

  static Logger logger = LoggerFactory.getLogger(StateMachineTargetsTest.class);

  StateConductorService mockService;
  StateConductorService service;

  String randCollection = UUID.randomUUID().toString();

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
    tokens.put("%GUID%", randCollection);

    // add data docs
    batch = getContentManager().newWriteSet();
    batch.add("/test/doc1.json", loadFileResource("data/doc1.json"));
    batch.add("/test/doc2.json", loadFileResource("data/doc2.json"));
    getContentManager().write(batch);

    // add stateMachine docs
    DocumentMetadataHandle stateMachineMeta = new DocumentMetadataHandle();
    stateMachineMeta.getCollections().add("state-conductor-state-machine");
    batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-state-machine/test-state-machine.asl.json", stateMachineMeta, loadFileResource("stateMachines/test-state-machine.asl.json"));
    batch.add("/state-conductor-state-machine/test2-state-machine.asl.json", stateMachineMeta, loadFileResource("stateMachines/test2-state-machine.asl.json"));
    batch.add("/state-conductor-state-machine/test3-state-machine.asl.json", stateMachineMeta, loadTokenizedResource("stateMachines/test3-state-machine.asl.json", tokens));
    getContentManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    deleteCollections(getExecutionsDatabaseClient(), "test");
  }

  @Test
  public void testFindTargetsMock() {
    String[] uris = mockService.findStateMachineTargets("test-state-machine", 1, 100, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(100, uris.length);
  }

  @Test
  public void testFindTargets() throws IOException {
    // no targets
    String[] uris = service.findStateMachineTargets("test3-state-machine", 1, 100, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(0, uris.length);
    // add targets
    DocumentWriteSet batch = getExecutionsManager().newWriteSet();
    DocumentMetadataHandle docMeta = new DocumentMetadataHandle();
    docMeta.getCollections().addAll("test", randCollection);
    batch = getContentManager().newWriteSet();
    batch.add("/test/docFindMe1.json", docMeta, loadFileResource("data/doc1.json"));
    batch.add("/test/docFindMe2.json", docMeta, loadFileResource("data/doc2.json"));
    getContentManager().write(batch);
    // find the targets
    uris = service.findStateMachineTargets("test3-state-machine", 1, 100, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    List<String> uriList = Arrays.asList(uris);
    assertEquals(2, uris.length);
    assertTrue(uriList.contains("/test/docFindMe1.json"));
    assertTrue(uriList.contains("/test/docFindMe2.json"));
    // cleanup
    deleteCollections(getDatabaseClient(), randCollection);
    // no targets
    uris = service.findStateMachineTargets("test3-state-machine", 1, 100, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(0, uris.length);
  }

  @Test
  public void testFindTargetsPaging() throws IOException {
    // insert test docs
    DocumentWriteSet batch = getExecutionsManager().newWriteSet();
    DocumentMetadataHandle docMeta = new DocumentMetadataHandle();
    docMeta.getCollections().addAll("test", randCollection);
    batch = getContentManager().newWriteSet();
    FileHandle fileHandle = loadFileResource("data/doc1.json");
    for (int i = 0; i < 25; i++) {
      batch.add(String.format("/test/docFindMe%s.json", i), docMeta, fileHandle);
    }
    getContentManager().write(batch);
    // page one
    String[] uris = service.findStateMachineTargets("test3-state-machine", 1, 20, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(20, uris.length);
    // page two
    uris = service.findStateMachineTargets("test3-state-machine", 21, 20, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(5, uris.length);
    // page three
    uris = service.findStateMachineTargets("test3-state-machine", 41, 20, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(0, uris.length);
    // change page size
    uris = service.findStateMachineTargets("test3-state-machine", 1, 100, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(25, uris.length);
    uris = service.findStateMachineTargets("test3-state-machine", 1, 5, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(5, uris.length);
    uris = service.findStateMachineTargets("test3-state-machine", 6, 5, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(5, uris.length);
    uris = service.findStateMachineTargets("test3-state-machine", 11, 5, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(5, uris.length);
    uris = service.findStateMachineTargets("test3-state-machine", 16, 5, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(5, uris.length);
    uris = service.findStateMachineTargets("test3-state-machine", 21, 5, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(5, uris.length);
    uris = service.findStateMachineTargets("test3-state-machine", 26, 5, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(0, uris.length);
    // test paging boundaries
    uris = service.findStateMachineTargets("test3-state-machine", -1, 100, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(0, uris.length);
    uris = service.findStateMachineTargets("test3-state-machine", 1, 0, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(25, uris.length);
    uris = service.findStateMachineTargets("test3-state-machine", 1, -100, null).toArray(String[]::new);
    logger.info("resp: {}", String.join(",", uris));
    assertEquals(25, uris.length);
    // cleanup
    deleteCollections(getDatabaseClient(), randCollection);
  }

  @Test
  public void testFindAndCreateExecutionsMock() {
    ObjectNode resp = mockService.findAndCreateExecutions("test-state-machine", 100, null, null);
    logger.info("resp: {}", resp.toPrettyString());
    assertEquals(100, resp.get("total").asInt());
    assertEquals("test-state-machine", resp.get("name").asText());
  }

  @Test
  public void testFindAndCreateExecutions() throws IOException {
    // no targets
    ObjectNode resp = service.findAndCreateExecutions("test3-state-machine", 100, null, null);
    logger.info("resp: {}", resp.toPrettyString());
    assertEquals("test3-state-machine", resp.get("name").asText());
    assertEquals(0, resp.get("total").asInt());
    // add targets
    DocumentWriteSet batch = getExecutionsManager().newWriteSet();
    DocumentMetadataHandle docMeta = new DocumentMetadataHandle();
    docMeta.getCollections().addAll("test", randCollection);
    batch = getContentManager().newWriteSet();
    batch.add("/test/docFindMe1.json", docMeta, loadFileResource("data/doc1.json"));
    batch.add("/test/docFindMe2.json", docMeta, loadFileResource("data/doc2.json"));
    getContentManager().write(batch);
    // find the targets
    resp = service.findAndCreateExecutions("test3-state-machine", 100, null, null);
    logger.info("resp: {}", resp.toPrettyString());
    assertEquals("test3-state-machine", resp.get("name").asText());
    assertEquals(2, resp.get("total").asInt());
    assertTrue(resp.get("executions").hasNonNull("/test/docFindMe1.json"));
    assertTrue(resp.get("executions").hasNonNull("/test/docFindMe2.json"));
    // find those execution docs
    String ex1 = resp.get("executions").get("/test/docFindMe1.json").asText();
    String ex2 = resp.get("executions").get("/test/docFindMe2.json").asText();
    StateConductorExecution executionDoc = getExecutionDocument("/stateConductorExecution/" + ex1 + ".json");
    assertTrue(executionDoc != null);
    assertEquals(ex1, executionDoc.getId());
    assertEquals("/test/docFindMe1.json", executionDoc.getUri());
    assertEquals("test3-state-machine", executionDoc.getName());
    executionDoc = getExecutionDocument("/stateConductorExecution/" + ex2 + ".json");
    assertTrue(executionDoc != null);
    assertEquals(ex2, executionDoc.getId());
    assertEquals("/test/docFindMe2.json", executionDoc.getUri());
    assertEquals("test3-state-machine", executionDoc.getName());
    // subsequent calls don't find these docs
    resp = service.findAndCreateExecutions("test3-state-machine", 100, null, null);
    logger.info("resp: {}", resp.toPrettyString());
    assertEquals("test3-state-machine", resp.get("name").asText());
    assertEquals(0, resp.get("total").asInt());
    // cleanup
    deleteCollections(getDatabaseClient(), randCollection);
    // no targets
    resp = service.findAndCreateExecutions("test3-state-machine", 100, null, null);
    logger.info("resp: {}", resp.toPrettyString());
    assertEquals("test3-state-machine", resp.get("name").asText());
    assertEquals(0, resp.get("total").asInt());
  }

  @Test
  public void testCreateExecutionsMock() {
    ArrayNode resp = mockService.createExecutions(
      Arrays.stream(new String[]{"/test/doc1.json", "/test/doc2.json"}),
      "test-state-machine", null, null);
    assertEquals(2, resp.size());
  }

  @Test
  public void testCreateExecutions() throws IOException {
    // create executions
    ArrayNode resp = service.createExecutions(
      Arrays.stream(new String[]{"/test/doc1.json", "/test/doc2.json"}),
      "test-state-machine", null, null);
    logger.info("resp: {}", resp.toPrettyString());
    // check response
    assertEquals(2, resp.size());
    // verify executions exist
    String id1 = resp.get(0).asText();
    StateConductorExecution executionDoc = getExecutionDocument("/stateConductorExecution/" + id1 + ".json");
    assertTrue(executionDoc != null);
    assertEquals(id1, executionDoc.getId());
    assertEquals("/test/doc1.json", executionDoc.getUri());
    assertEquals("test-state-machine", executionDoc.getName());

    String id2 = resp.get(1).asText();
    executionDoc = getExecutionDocument("/stateConductorExecution/" + id2 + ".json");
    assertTrue(executionDoc != null);
    assertEquals(id2, executionDoc.getId());
    assertEquals("/test/doc2.json", executionDoc.getUri());
    assertEquals("test-state-machine", executionDoc.getName());
  }
}
