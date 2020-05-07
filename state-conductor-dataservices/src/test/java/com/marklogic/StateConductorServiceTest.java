package com.marklogic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.marklogic.client.FailedRequestException;
import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.ext.AbstractStateConductorTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class StateConductorServiceTest extends AbstractStateConductorTest {

  static Logger logger = LoggerFactory.getLogger(StateConductorServiceTest.class);

  final String data1Uri = "/test/doc1.json";
  final String data2Uri = "/test/doc2.json";
  final String job1Uri = "/test/stateConductorJob/job1.json";
  final String job2Uri = "/test/stateConductorJob/job2.json";
  final String job3Uri = "/test/stateConductorJob/job3.json";
  final String job4Uri = "/test/stateConductorJob/job4.json";
  final String job5Uri = "/test/stateConductorJob/job5.json";
  final String badJob1Uri = "/test/stateConductorJob/badJob1.json";

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

    // add job docs
    DocumentWriteSet batch = getJobsManager().newWriteSet();
    DocumentMetadataHandle jobMeta = new DocumentMetadataHandle();
    jobMeta.getCollections().add("stateConductorJob");
    jobMeta.getPermissions().add("state-conductor-reader-role", DocumentMetadataHandle.Capability.READ);
    jobMeta.getPermissions().add("state-conductor-job-writer-role", DocumentMetadataHandle.Capability.UPDATE);
    batch.add("/test/stateConductorJob/job1.json", jobMeta, loadTokenizedResource("jobs/job1.json", tokens));
    batch.add("/test/stateConductorJob/job2.json", jobMeta, loadTokenizedResource("jobs/job2.json", tokens));
    batch.add("/test/stateConductorJob/job3.json", jobMeta, loadTokenizedResource("jobs/job3.json", tokens));
    batch.add("/test/stateConductorJob/job4.json", jobMeta, loadTokenizedResource("jobs/job4.json", tokens));
    batch.add("/test/stateConductorJob/job5.json", jobMeta, loadTokenizedResource("jobs/job5.json", tokens));
    batch.add("/test/stateConductorJob/badJob1.json", jobMeta, loadTokenizedResource("jobs/badJob1.json", tokens));
    getJobsManager().write(batch);

    // add data docs
    batch = getContentManager().newWriteSet();
    batch.add("/test/doc1.json", loadFileResource("data/doc1.json"));
    batch.add("/test/doc2.json", loadFileResource("data/doc2.json"));
    getContentManager().write(batch);

    // add flow docs
    DocumentMetadataHandle flowMeta = new DocumentMetadataHandle();
    flowMeta.getCollections().add("state-conductor-flow");
    batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-flow/test-flow.asl.json", flowMeta, loadFileResource("flows/test-flow.asl.json"));
    getContentManager().write(batch);
  }

  @Test
  public void testGetJobsMock() {
    int count = 10;
    Object[] uris = mockService.getJobs(count, null, null, null).toArray();
    assertEquals(count, uris.length);
    assertEquals("/test/test1.json", uris[0].toString());
    assertEquals("/test/test2.json", uris[1].toString());
    assertEquals("/test/test10.json", uris[9].toString());
  }

  @Test
  public void testGetJobs() throws IOException {
    int count = 10;
    String[] status;
    String[] uris;
    StateConductorJob jobDoc;

    uris = service.getJobs(1000, null, null, null).toArray(String[]::new);
    assertTrue(3 <= uris.length);
    for (int i = 0; i < uris.length; i++) {
      String flowStatus = getJobDocument(uris[i]).getFlowStatus();
      assertTrue((flowStatus.equals("new") || flowStatus.equals("working")));
    }

    status = new String[]{ "new" };
    uris = service.getJobs(count, null, Arrays.stream(status), null).toArray(String[]::new);
    assertTrue(2 <= uris.length);
    for (int i = 0; i < uris.length; i++) {
      assertEquals("new", getJobDocument(uris[i]).getFlowStatus());
    }

    status = new String[]{ "new" };
    uris = service.getJobs(count, "test-flow", Arrays.stream(status), null).toArray(String[]::new);
    assertTrue(2 <= uris.length);
    for (int i = 0; i < uris.length; i++) {
      assertEquals("new", getJobDocument(uris[i]).getFlowStatus());
      assertEquals("test-flow", getJobDocument(uris[i]).getFlowName());
    }

    status = new String[]{ "working" };
    uris = service.getJobs(count, "test-flow", Arrays.stream(status), null).toArray(String[]::new);
    assertEquals(1, uris.length);
    assertEquals("working", getJobDocument(uris[0]).getFlowStatus());
    assertEquals("test-flow", getJobDocument(uris[0]).getFlowName());
    assertEquals("job3", getJobDocument(uris[0]).getId());

    status = new String[]{ "complete" };
    uris = service.getJobs(count, "test-flow", Arrays.stream(status), null).toArray(String[]::new);
    assertEquals(1, uris.length);
    assertEquals("complete", getJobDocument(uris[0]).getFlowStatus());
    assertEquals("test-flow", getJobDocument(uris[0]).getFlowName());
    assertEquals("job4", getJobDocument(uris[0]).getId());

    status = new String[]{ "failed" };
    uris = service.getJobs(count, "test-flow", Arrays.stream(status), null).toArray(String[]::new);
    assertEquals(1, uris.length);
    assertEquals("failed", getJobDocument(uris[0]).getFlowStatus());
    assertEquals("test-flow", getJobDocument(uris[0]).getFlowName());
    assertEquals("job5", getJobDocument(uris[0]).getId());

    status = new String[]{ "complete", "failed" };
    uris = service.getJobs(count, "test-flow", Arrays.stream(status), null).toArray(String[]::new);
    assertTrue(2 <= uris.length);
    for (int i = 0; i < uris.length; i++) {
      String flowStatus = getJobDocument(uris[i]).getFlowStatus();
      assertTrue((flowStatus.equals("complete") || flowStatus.equals("failed")));
      assertEquals("test-flow", getJobDocument(uris[i]).getFlowName());
    }

    uris = service.getJobs(count, "fake-flow", null, null).toArray(String[]::new);
    assertEquals(0, uris.length);
  }

  @Test
  public void testCreateJobMock() {
    String resp = mockService.createJob(data2Uri, "test-flow");
    assertTrue(resp.length() > 0);
  }

  @Test
  public void testCreateJob() throws IOException {
    String resp = service.createJob(data2Uri, "test-flow");
    assertTrue(resp.length() > 0);

    StateConductorJob jobDoc = getJobDocument("/stateConductorJob/" + resp + ".json");
    assertTrue(jobDoc != null);
    assertEquals(resp, jobDoc.getId());
    assertEquals(data2Uri, jobDoc.getUri());
    assertEquals("test-flow", jobDoc.getFlowName());

    assertThrows(FailedRequestException.class, () -> {
      service.createJob("/my/fake/document.json", "test-flow");
    });

    assertThrows(FailedRequestException.class, () -> {
      service.createJob(data2Uri, "my-fake-flow");
    });
  }

  @Test
  public void testProcessJobMock() {
    ArrayNode resp = mockService.processJob(Arrays.stream(new String[]{"/test.json"}));
    assertEquals("/test.json", resp.get(0).get("job").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
  }

  @Test
  public void testProcessJob() throws IOException {
    ArrayNode resp;
    DocumentMetadataHandle meta = new DocumentMetadataHandle();
    StateConductorJob job1Doc;

    // start job 1
    resp = service.processJob(Arrays.stream(new String[]{job1Uri}));
    job1Doc = getJobDocument(job1Uri);
    getContentManager().readMetadata(data1Uri, meta);
    assertEquals(job1Uri, resp.get(0).get("job").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals(false, meta.getCollections().contains("testcol1"));
    assertEquals(false, meta.getCollections().contains("testcol2"));
    assertEquals("test-flow", job1Doc.getFlowName());
    assertEquals("working", job1Doc.getFlowStatus());
    assertEquals("add-collection-1", job1Doc.getFlowState());
    // continue job 1
    resp = service.processJob(Arrays.stream(new String[]{job1Uri}));
    job1Doc = getJobDocument(job1Uri);
    getContentManager().readMetadata(data1Uri, meta);
    assertEquals(job1Uri, resp.get(0).get("job").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals(true, meta.getCollections().contains("testcol1"));
    assertEquals(false, meta.getCollections().contains("testcol2"));
    assertEquals("test-flow", job1Doc.getFlowName());
    assertEquals("working", job1Doc.getFlowStatus());
    assertEquals("add-collection-2", job1Doc.getFlowState());
    // continue job 1
    resp = service.processJob(Arrays.stream(new String[]{job1Uri}));
    job1Doc = getJobDocument(job1Uri);
    getContentManager().readMetadata(data1Uri, meta);
    assertEquals(job1Uri, resp.get(0).get("job").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals(true, meta.getCollections().contains("testcol1"));
    assertEquals(true, meta.getCollections().contains("testcol2"));
    assertEquals("test-flow", job1Doc.getFlowName());
    assertEquals("working", job1Doc.getFlowStatus());
    assertEquals("success", job1Doc.getFlowState());
    // continue job 1
    resp = service.processJob(Arrays.stream(new String[]{job1Uri}));
    job1Doc = getJobDocument(job1Uri);
    assertEquals(job1Uri, resp.get(0).get("job").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals("test-flow", job1Doc.getFlowName());
    assertEquals("complete", job1Doc.getFlowStatus());
    assertEquals("success", job1Doc.getFlowState());
    // end job 1
    resp = service.processJob(Arrays.stream(new String[]{job1Uri}));
    job1Doc = getJobDocument(job1Uri);
    assertEquals(job1Uri, resp.get(0).get("job").asText());
    assertEquals(false, resp.get(0).get("result").asBoolean());
    assertEquals("test-flow", job1Doc.getFlowName());
    assertEquals("complete", job1Doc.getFlowStatus());
    assertEquals("success", job1Doc.getFlowState());
  }

  @Test
  public void testBatchProcessJob() throws IOException {
    ArrayNode resp;
    DocumentMetadataHandle meta = new DocumentMetadataHandle();

    String[] jobs = new String[] {job1Uri, job2Uri, job3Uri, job4Uri, job5Uri};

    // start job 1
    resp = service.processJob(Arrays.stream(jobs));
    assertEquals(job1Uri, resp.get(0).get("job").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals(job2Uri, resp.get(1).get("job").asText());
    assertEquals(true, resp.get(1).get("result").asBoolean());
    assertEquals(job3Uri, resp.get(2).get("job").asText());
    assertEquals(true, resp.get(2).get("result").asBoolean());
    assertEquals(job4Uri, resp.get(3).get("job").asText());
    assertEquals(false, resp.get(3).get("result").asBoolean());
    assertEquals(job5Uri, resp.get(4).get("job").asText());
    assertEquals(false, resp.get(4).get("result").asBoolean());
  }

  @Test
  public void testProcessBadJob() throws IOException {
    ArrayNode resp = null;
    Exception errorResp = null;
    StateConductorJob badJob1Doc;

    try {
      resp = service.processJob(Arrays.stream(new String[]{badJob1Uri}));
    } catch (Exception err) {
      errorResp = err;
    }

    badJob1Doc = getJobDocument(badJob1Uri);
    logger.info(badJob1Doc.toString());

    assertEquals(null, errorResp);
    assertNotNull(resp);
    assertEquals("missing-flow", badJob1Doc.getFlowName());
    assertEquals("new", badJob1Doc.getFlowStatus());  // TODO seems like this should be "failed"
  }

  @Test
  public void testBatchProcessWithBadJob() throws IOException {
    ArrayNode resp = null;
    Exception errorResp = null;
    StateConductorJob jobDoc = null;
    DocumentMetadataHandle meta = new DocumentMetadataHandle();

    String[] jobs = new String[] {job1Uri, job2Uri, badJob1Uri, job3Uri};

    // this batch contains a job that will fail
    try {
      resp = service.processJob(Arrays.stream(jobs));
    } catch (Exception ex) {
      errorResp = ex;
    }

    assertEquals(null, errorResp);
    assertNotNull(resp);

    jobDoc = getJobDocument(job1Uri);
    logger.info(jobDoc.toString());
    assertEquals("test-flow", jobDoc.getFlowName());
    assertEquals("working", jobDoc.getFlowStatus());
    assertEquals("add-collection-1", jobDoc.getFlowState());

    jobDoc = getJobDocument(job2Uri);
    logger.info(jobDoc.toString());
    assertEquals("test-flow", jobDoc.getFlowName());
    assertEquals("working", jobDoc.getFlowStatus());
    assertEquals("add-collection-1", jobDoc.getFlowState());

    jobDoc = getJobDocument(job3Uri);
    logger.info(jobDoc.toString());
    getContentManager().readMetadata(data2Uri, meta);
    assertEquals("test-flow", jobDoc.getFlowName());
    assertEquals("working", jobDoc.getFlowStatus());
    assertEquals("add-collection-2", jobDoc.getFlowState());
    assertEquals(true, meta.getCollections().contains("testcol1"));

    assertEquals(job1Uri, resp.get(0).get("job").asText());
    assertEquals(true, resp.get(0).get("result").asBoolean());
    assertEquals(job2Uri, resp.get(1).get("job").asText());
    assertEquals(true, resp.get(1).get("result").asBoolean());
    assertEquals(badJob1Uri, resp.get(2).get("job").asText());
    assertEquals(false, resp.get(2).get("result").asBoolean());
    assertNotNull(resp.get(2).get("error"));
    assertEquals(job3Uri, resp.get(3).get("job").asText());
    assertEquals(true, resp.get(3).get("result").asBoolean());
  }

}
