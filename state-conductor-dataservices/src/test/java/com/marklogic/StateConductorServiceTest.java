package com.marklogic;

import com.marklogic.client.FailedRequestException;
import com.marklogic.client.document.DocumentWriteSet;
import com.marklogic.client.io.DocumentMetadataHandle;
import com.marklogic.ext.AbstractStateConductorTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

public class StateConductorServiceTest extends AbstractStateConductorTest {

  static Logger logger = LoggerFactory.getLogger(StateConductorServiceTest.class);

  final String data1Uri = "/test/doc1.json";
  final String data2Uri = "/test/doc2.json";
  final String job1Uri = "/test/stateConductorJob/job1.json";
  final String job2Uri = "/test/stateConductorJob/job2.json";

  StateConductorService mockService;
  StateConductorService service;

/*  @AfterAll
  public static void suiteTeardown() {
    JSONDocumentManager mgr = jobsClient.newJSONDocumentManager();
    mgr.delete("/test/stateConductorJob/doc1.json");
  }*/

  @BeforeEach
  public void setup() throws FileNotFoundException {
    // setup the service
    mockService = new StateConductorServiceMock();
    service = StateConductorService.on(getDatabaseClient());

    // add job docs
    DocumentWriteSet batch = getJobsManager().newWriteSet();
    batch.add("/test/stateConductorJob/job1.json", loadFileResource("jobs/job1.json"));
    batch.add("/test/stateConductorJob/job2.json", loadFileResource("jobs/job2.json"));
    getJobsManager().write(batch);

    // add data docs
    batch = getContentManager().newWriteSet();
    batch.add("/test/doc1.json", loadFileResource("data/doc1.json"));
    batch.add("/test/doc2.json", loadFileResource("data/doc2.json"));
    getContentManager().write(batch);

    // add flow docs
    DocumentMetadataHandle meta = new DocumentMetadataHandle();
    meta.getCollections().add("state-conductor-flow");
    batch = getContentManager().newWriteSet();
    batch.add("/state-conductor-flow/test-flow.asl.json", meta, loadFileResource("flows/test-flow.asl.json"));
    getContentManager().write(batch);
  }

  @Test
  public void testGetJobsMock() {
    int count = 10;
    Object[] uris = mockService.getJobs(count, null, null).toArray();
    assertEquals(count, uris.length);
    assertEquals("/test/test1.json", uris[0].toString());
    assertEquals("/test/test2.json", uris[1].toString());
    assertEquals("/test/test10.json", uris[9].toString());
  }

  @Test
  public void testGetJobs() {
    int count = 10;
    String[] status = { "new" };
    String[] uris = service.getJobs(count, null, Arrays.stream(status)).toArray(String[]::new);
    assertEquals(2, uris.length);
    logger.info("URIS: {}", String.join(",", Arrays.asList(uris)));
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
    boolean resp = mockService.processJob("/test.json");
    assertEquals(true, resp);
  }

  @Test
  public void testProcessJob() throws IOException {
    boolean resp;
    DocumentMetadataHandle meta = new DocumentMetadataHandle();
    StateConductorJob job1Doc;

    // start job 1
    resp = service.processJob(job1Uri);
    job1Doc = getJobDocument(job1Uri);
    getContentManager().readMetadata(data1Uri, meta);
    assertEquals(true, resp);
    assertEquals(false, meta.getCollections().contains("testcol1"));
    assertEquals(false, meta.getCollections().contains("testcol2"));
    assertEquals("test-flow", job1Doc.getFlowName());
    assertEquals("working", job1Doc.getFlowStatus());
    assertEquals("add-collection-1", job1Doc.getFlowState());
    // continue job 1
    resp = service.processJob(job1Uri);
    job1Doc = getJobDocument(job1Uri);
    getContentManager().readMetadata(data1Uri, meta);
    assertEquals(true, resp);
    assertEquals(true, meta.getCollections().contains("testcol1"));
    assertEquals(false, meta.getCollections().contains("testcol2"));
    assertEquals("test-flow", job1Doc.getFlowName());
    assertEquals("working", job1Doc.getFlowStatus());
    assertEquals("add-collection-2", job1Doc.getFlowState());
    // continue job 1
    resp = service.processJob(job1Uri);
    job1Doc = getJobDocument(job1Uri);
    getContentManager().readMetadata(data1Uri, meta);
    assertEquals(true, resp);
    assertEquals(true, meta.getCollections().contains("testcol1"));
    assertEquals(true, meta.getCollections().contains("testcol2"));
    assertEquals("test-flow", job1Doc.getFlowName());
    assertEquals("working", job1Doc.getFlowStatus());
    assertEquals("success", job1Doc.getFlowState());
    // continue job 1
    resp = service.processJob(job1Uri);
    job1Doc = getJobDocument(job1Uri);
    assertEquals(true, resp);
    assertEquals("test-flow", job1Doc.getFlowName());
    assertEquals("complete", job1Doc.getFlowStatus());
    assertEquals("success", job1Doc.getFlowState());
    // end job 1
    resp = service.processJob(job1Uri);
    job1Doc = getJobDocument(job1Uri);
    assertEquals(false, resp);
    assertEquals("test-flow", job1Doc.getFlowName());
    assertEquals("complete", job1Doc.getFlowStatus());
    assertEquals("success", job1Doc.getFlowState());
  }

}
