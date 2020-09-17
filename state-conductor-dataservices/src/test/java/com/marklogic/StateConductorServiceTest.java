package com.marklogic;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marklogic.client.FailedRequestException;
import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.ext.AbstractStateConductorTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.StringReader;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class StateConductorServiceTest extends AbstractStateConductorTest {

  static Logger logger = LoggerFactory.getLogger(StateConductorServiceTest.class);

  final String data1Uri = "/test/doc1.json";
  final String data2Uri = "/test/doc2.json";
  final String execution1Uri = "/test/stateConductorExecution/execution1.json";
  final String execution2Uri = "/test/stateConductorExecution/execution2.json";
  final String execution3Uri = "/test/stateConductorExecution/execution3.json";
  final String execution4Uri = "/test/stateConductorExecution/execution4.json";
  final String execution5Uri = "/test/stateConductorExecution/execution5.json";
  final String badExecution1Uri = "/test/stateConductorExecution/badExecution1.json";

  StateConductorService mockService;
  StateConductorService service;

  @BeforeEach
  public void setup() throws IOException {
    // setup the service
    mockService = new StateConductorServiceMock();
    service = StateConductorService.on(getDatabaseClient());

    // replacement tokens
    Map<String, String> tokens = new HashMap<>();
    tokens.put("%DATABASE%", getContentDatabaseId());
    tokens.put("%MODULES%", getModulesDatabaseId());

    // add execution docs
    DocumentWriteSet batch = getExecutionsManager().newWriteSet();
    DocumentMetadataHandle executionMeta = new DocumentMetadataHandle();
    executionMeta.getCollections().addAll("stateConductorExecution", "test");
    executionMeta.getPermissions().add("state-conductor-reader-role", DocumentMetadataHandle.Capability.READ);
    executionMeta.getPermissions().add("state-conductor-execution-writer-role", DocumentMetadataHandle.Capability.UPDATE);
    batch.add("/test/stateConductorExecution/execution1.json", executionMeta, loadTokenizedResource("executions/execution1.json", tokens));
    batch.add("/test/stateConductorExecution/execution2.json", executionMeta, loadTokenizedResource("executions/execution2.json", tokens));
    batch.add("/test/stateConductorExecution/execution3.json", executionMeta, loadTokenizedResource("executions/execution3.json", tokens));
    batch.add("/test/stateConductorExecution/execution4.json", executionMeta, loadTokenizedResource("executions/execution4.json", tokens));
    batch.add("/test/stateConductorExecution/execution5.json", executionMeta, loadTokenizedResource("executions/execution5.json", tokens));
    batch.add("/test/stateConductorExecution/badExecution1.json", executionMeta, loadTokenizedResource("executions/badExecution1.json", tokens));
    getExecutionsManager().write(batch);

    // add data docs
    batch = getContentManager().newWriteSet();
    batch.add("/test/doc1.json", loadFileResource("data/doc1.json"));
    batch.add("/test/doc2.json", loadFileResource("data/doc2.json"));
    getContentManager().write(batch);

    // add state machine docs
    DocumentMetadataHandle meta = new DocumentMetadataHandle();
    meta.getCollections().add("state-conductor-state-machine");
    batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-state-machine/test-state-machine.asl.json", meta, loadFileResource("stateMachines/test-state-machine.asl.json"));
    getContentManager().write(batch);
  }

  @AfterEach
  public void teardown() {
    deleteCollections(getExecutionsDatabaseClient(), "test");
  }

  @Test
  public void testGetExecutionsMock() {
    int count = 10;
    Object[] uris = mockService.getExecutions(1, count, null, null, null, null, null).toArray();
    assertEquals(count, uris.length);
    assertEquals("/test/test1.json", uris[0].toString());
    assertEquals("/test/test2.json", uris[1].toString());
    assertEquals("/test/test10.json", uris[9].toString());
  }

  @Test
  public void testGetStateMachine() throws IOException {
    final String stateMachineName = "test-state-machine";
    final ObjectNode allStateMachines = service.getStateMachine(null);
    assertEquals("does things", allStateMachines.get(stateMachineName).get("Comment").asText());
    final ObjectNode testStateMachine = service.getStateMachine(stateMachineName);
    assertEquals("does things", testStateMachine.get("Comment").asText());
    try {
      service.getStateMachine("test-state-machine-that-does-not-exist");
      assertTrue(false, "Failed to throw exception for bad stateMachineName");
    }
    catch(Exception e) {
      assertTrue(true);
    }
  }

  @Test
  public void testInsertStateMachine() throws IOException {
    final String stateMachineName = "test-state-machine";
    final ObjectNode testStateMachine = service.getStateMachine(stateMachineName);
    assertEquals("does things", testStateMachine.get("Comment").asText());
    testStateMachine.put("Comment", "Also Does Other Things");
    service.insertStateMachine(stateMachineName, new StringReader(testStateMachine.toString()));
    final ObjectNode updatedTestStateMachine = service.getStateMachine(stateMachineName);
    assertNotNull(updatedTestStateMachine);
    assertEquals("Also Does Other Things", testStateMachine.get("Comment").asText());
  }

  @Test
  public void testDeleteStateMachine() throws IOException {
    final String newName = "new-test-state-machine";
    final String stateMachineName = "test-state-machine";
    service.insertStateMachine(newName, new StringReader(service.getStateMachine(stateMachineName).toString()));
    final ObjectNode updatedTestStateMachine = service.getStateMachine(stateMachineName);
    assertEquals("does things", updatedTestStateMachine.get("Comment").asText());
    service.deleteStateMachine(newName);
    try {
      service.getStateMachine(newName);
      assertTrue(false, "Failed to delete newName");
    }
    catch(Exception e) {
      assertTrue(true);
    }
  }

  @Test
  public void testGetExecutions() throws IOException {
    int count = 10;
    String[] status;
    String[] uris;

    uris = service.getExecutions(1, 1000, null, null, null, null, null).toArray(String[]::new);
    assertTrue(3 <= uris.length);
    for (int i = 0; i < uris.length; i++) {
      String stateMachineStatus = getExecutionDocument(uris[i]).getStatus();
      assertTrue((stateMachineStatus.equals("new") || stateMachineStatus.equals("working")));
    }

    status = new String[]{ "new" };
    uris = service.getExecutions(1, count, null, Arrays.stream(status), null, null, null).toArray(String[]::new);
    assertTrue(2 <= uris.length);
    for (int i = 0; i < uris.length; i++) {
      assertEquals("new", getExecutionDocument(uris[i]).getStatus());
    }

    status = new String[]{ "new" };
    uris = service.getExecutions(1, count, "test-state-machine", Arrays.stream(status), null, null, null).toArray(String[]::new);
    assertTrue(2 <= uris.length);
    for (int i = 0; i < uris.length; i++) {
      assertEquals("new", getExecutionDocument(uris[i]).getStatus());
      assertEquals("test-state-machine", getExecutionDocument(uris[i]).getName());
    }

    status = new String[]{ "working" };
    uris = service.getExecutions(1, count, "test-state-machine", Arrays.stream(status), null, null, null).toArray(String[]::new);
    assertEquals(1, uris.length);
    assertEquals("working", getExecutionDocument(uris[0]).getStatus());
    assertEquals("test-state-machine", getExecutionDocument(uris[0]).getName());
    assertEquals("execution3", getExecutionDocument(uris[0]).getId());

    status = new String[]{ "complete" };
    uris = service.getExecutions(1, count, "test-state-machine", Arrays.stream(status), null, null, null).toArray(String[]::new);
    assertEquals(1, uris.length);
    assertEquals("complete", getExecutionDocument(uris[0]).getStatus());
    assertEquals("test-state-machine", getExecutionDocument(uris[0]).getName());
    assertEquals("execution4", getExecutionDocument(uris[0]).getId());

    status = new String[]{ "failed" };
    uris = service.getExecutions(1, count, "test-state-machine", Arrays.stream(status), null, null, null).toArray(String[]::new);
    assertEquals(1, uris.length);
    assertEquals("failed", getExecutionDocument(uris[0]).getStatus());
    assertEquals("test-state-machine", getExecutionDocument(uris[0]).getName());
    assertEquals("execution5", getExecutionDocument(uris[0]).getId());

    status = new String[]{ "complete", "failed" };
    uris = service.getExecutions(1, count, "test-state-machine", Arrays.stream(status), null, null, null).toArray(String[]::new);
    assertTrue(2 <= uris.length);
    for (int i = 0; i < uris.length; i++) {
      String stateMachineStatus = getExecutionDocument(uris[i]).getStatus();
      assertTrue((stateMachineStatus.equals("complete") || stateMachineStatus.equals("failed")));
      assertEquals("test-state-machine", getExecutionDocument(uris[i]).getName());
    }

    uris = service.getExecutions(1, count, "fake-state-machine", null, null, null, null).toArray(String[]::new);
    assertEquals(0, uris.length);
  }

  @Test
  public void testCreateExecutionMock() {
    String resp = mockService.createExecution(data2Uri, "test-state-machine");
    assertTrue(resp.length() > 0);
  }

  @Test
  public void testCreateExecution() throws IOException {
    String resp = service.createExecution(data2Uri, "test-state-machine");
    assertTrue(resp.length() > 0);

    StateConductorExecution executionDoc = getExecutionDocument("/stateConductorExecution/" + resp + ".json");
    assertTrue(executionDoc != null);
    assertEquals(resp, executionDoc.getId());
    assertEquals(data2Uri, executionDoc.getUri());
    assertEquals("test-state-machine", executionDoc.getName());

    assertThrows(FailedRequestException.class, () -> {
      service.createExecution("/my/fake/document.json", "test-state-machine");
    });

    assertThrows(FailedRequestException.class, () -> {
      service.createExecution(data2Uri, "my-fake-state-machine");
    });
  }

  @Test
  public void testProcessExecutionMock() {
    ArrayNode resp = mockService.processExecution(Arrays.stream(new String[]{"/test.json"}));
    assertEquals("/test.json", resp.get(0).get("execution").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
  }

  @Test
  public void testProcessExecution() throws IOException {
    ArrayNode resp;
    DocumentMetadataHandle meta = new DocumentMetadataHandle();
    StateConductorExecution execution1Doc;

    // start execution 1
    resp = service.processExecution(Arrays.stream(new String[]{execution1Uri}));
    execution1Doc = getExecutionDocument(execution1Uri);
    getContentManager().readMetadata(data1Uri, meta);
    assertEquals(execution1Uri, resp.get(0).get("execution").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals(false, meta.getCollections().contains("testcol1"));
    assertEquals(false, meta.getCollections().contains("testcol2"));
    assertEquals("test-state-machine", execution1Doc.getName());
    assertEquals("working", execution1Doc.getStatus());
    assertEquals("add-collection-1", execution1Doc.getState());
    // continue execution 1
    resp = service.processExecution(Arrays.stream(new String[]{execution1Uri}));
    execution1Doc = getExecutionDocument(execution1Uri);
    getContentManager().readMetadata(data1Uri, meta);
    assertEquals(execution1Uri, resp.get(0).get("execution").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals(true, meta.getCollections().contains("testcol1"));
    assertEquals(false, meta.getCollections().contains("testcol2"));
    assertEquals("test-state-machine", execution1Doc.getName());
    assertEquals("working", execution1Doc.getStatus());
    assertEquals("add-collection-2", execution1Doc.getState());
    // continue execution 1
    resp = service.processExecution(Arrays.stream(new String[]{execution1Uri}));
    execution1Doc = getExecutionDocument(execution1Uri);
    getContentManager().readMetadata(data1Uri, meta);
    assertEquals(execution1Uri, resp.get(0).get("execution").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals(true, meta.getCollections().contains("testcol1"));
    assertEquals(true, meta.getCollections().contains("testcol2"));
    assertEquals("test-state-machine", execution1Doc.getName());
    assertEquals("working", execution1Doc.getStatus());
    assertEquals("success", execution1Doc.getState());
    // continue execution 1
    resp = service.processExecution(Arrays.stream(new String[]{execution1Uri}));
    execution1Doc = getExecutionDocument(execution1Uri);
    assertEquals(execution1Uri, resp.get(0).get("execution").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals("test-state-machine", execution1Doc.getName());
    assertEquals("complete", execution1Doc.getStatus());
    assertEquals("success", execution1Doc.getState());
    // end execution 1
    resp = service.processExecution(Arrays.stream(new String[]{execution1Uri}));
    execution1Doc = getExecutionDocument(execution1Uri);
    assertEquals(execution1Uri, resp.get(0).get("execution").asText());
    assertEquals(false, resp.get(0).get("result").asBoolean());
    assertEquals("test-state-machine", execution1Doc.getName());
    assertEquals("complete", execution1Doc.getStatus());
    assertEquals("success", execution1Doc.getState());
  }

  @Test
  public void testBatchProcessExecution() throws IOException {
    ArrayNode resp;

    String[] executions = new String[] {execution1Uri, execution2Uri, execution3Uri, execution4Uri, execution5Uri};

    // start execution 1
    resp = service.processExecution(Arrays.stream(executions));
    assertEquals(execution1Uri, resp.get(0).get("execution").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals(execution2Uri, resp.get(1).get("execution").asText());
    assertEquals(true, resp.get(1).get("result").asBoolean());
    assertEquals(execution3Uri, resp.get(2).get("execution").asText());
    assertEquals(true, resp.get(2).get("result").asBoolean());
    assertEquals(execution4Uri, resp.get(3).get("execution").asText());
    assertEquals(false, resp.get(3).get("result").asBoolean());
    assertEquals(execution5Uri, resp.get(4).get("execution").asText());
    assertEquals(false, resp.get(4).get("result").asBoolean());
  }

  @Test
  public void testProcessBadExecution() throws IOException {
    ArrayNode resp = null;
    Exception errorResp = null;
    StateConductorExecution badExecution1Doc;

    try {
      resp = service.processExecution(Arrays.stream(new String[]{badExecution1Uri}));
    } catch (Exception err) {
      errorResp = err;
    }

    badExecution1Doc = getExecutionDocument(badExecution1Uri);
    logger.info(badExecution1Doc.toString());

    assertEquals(null, errorResp);
    assertNotNull(resp);
    assertEquals("missing-state-machine", badExecution1Doc.getName());
    assertEquals("failed", badExecution1Doc.getStatus());
  }

  @Test
  public void testBatchProcessWithBadExecution() throws IOException {
    ArrayNode resp = null;
    Exception errorResp = null;
    StateConductorExecution executionDoc = null;
    DocumentMetadataHandle meta = new DocumentMetadataHandle();

    String[] executions = new String[] {execution1Uri, execution2Uri, badExecution1Uri, execution3Uri};

    // this batch contains a execution that will fail
    try {
      resp = service.processExecution(Arrays.stream(executions));
    } catch (Exception ex) {
      errorResp = ex;
    }

    assertEquals(null, errorResp);
    assertNotNull(resp);

    executionDoc = getExecutionDocument(execution1Uri);
    logger.info(executionDoc.toString());
    assertEquals("test-state-machine", executionDoc.getName());
    assertEquals("working", executionDoc.getStatus());
    assertEquals("add-collection-1", executionDoc.getState());

    executionDoc = getExecutionDocument(execution2Uri);
    logger.info(executionDoc.toString());
    assertEquals("test-state-machine", executionDoc.getName());
    assertEquals("working", executionDoc.getStatus());
    assertEquals("add-collection-1", executionDoc.getState());

    executionDoc = getExecutionDocument(execution3Uri);
    logger.info(executionDoc.toString());
    getContentManager().readMetadata(data2Uri, meta);
    assertEquals("test-state-machine", executionDoc.getName());
    assertEquals("working", executionDoc.getStatus());
    assertEquals("add-collection-2", executionDoc.getState());
    assertEquals(true, meta.getCollections().contains("testcol1"));

    executionDoc = getExecutionDocument(badExecution1Uri);
    logger.info(executionDoc.toString());
    assertEquals("missing-state-machine", executionDoc.getName());
    assertEquals("failed", executionDoc.getStatus());

    assertEquals(execution1Uri, resp.get(0).get("execution").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals(execution2Uri, resp.get(1).get("execution").asText());
    assertEquals(true, resp.get(1).get("result").asBoolean());
    assertEquals(badExecution1Uri, resp.get(2).get("execution").asText());
    assertEquals(true, resp.get(2).get("result").asBoolean());
    assertEquals(execution3Uri, resp.get(3).get("execution").asText());
    assertEquals(true, resp.get(3).get("result").asBoolean());
  }

  @Test
  public void testProcessFailedExecution() throws IOException {
    // this bad execution will go into 'failed' the first time through
    // the second attempt should return 'false' for the failed execution

    ArrayNode resp = null;
    Exception errorResp = null;
    StateConductorExecution badExecution1Doc;

    try {
      resp = service.processExecution(Arrays.stream(new String[]{badExecution1Uri}));
    } catch (Exception err) {
      errorResp = err;
    }

    badExecution1Doc = getExecutionDocument(badExecution1Uri);
    logger.info(badExecution1Doc.toString());

    assertEquals(null, errorResp);
    assertNotNull(resp);
    assertEquals(badExecution1Uri, resp.get(0).get("execution").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals("missing-state-machine", badExecution1Doc.getName());
    assertEquals("failed", badExecution1Doc.getStatus());

    try {
      resp = service.processExecution(Arrays.stream(new String[]{badExecution1Uri}));
    } catch (Exception err) {
      errorResp = err;
    }

    assertEquals(null, errorResp);
    assertNotNull(resp);
    assertEquals(badExecution1Uri, resp.get(0).get("execution").asText());
    assertEquals(false, resp.get(0).get("result").asBoolean());
  }

  @Test
  public void testExpectedExceptions() throws IOException {
    ArrayNode resp = null;
    Exception errorResp = null;

    String[] executions = new String[] {"/not/a/real/execution1.json", "/not/a/real/execution2.json"};

    try {
      resp = service.processExecution(Arrays.stream(executions));
    } catch (Exception err) {
      errorResp = err;
    }

    logger.info(resp.toString());

    assertEquals(null, errorResp);
    assertNotNull(resp);
    assertEquals("/not/a/real/execution1.json", resp.get(0).get("execution").asText());
    assertEquals(false, resp.get(0).get("result").asBoolean());
    assertNotNull(resp.get(0).get("error").asText());
    assertEquals("/not/a/real/execution2.json", resp.get(1).get("execution").asText());
    assertEquals(false, resp.get(1).get("result").asBoolean());
    assertNotNull(resp.get(1).get("error").asText());
  }

}
