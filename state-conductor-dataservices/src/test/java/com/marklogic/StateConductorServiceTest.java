package com.marklogic;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import java.util.Arrays;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class StateConductorServiceTest {

  static Logger logger = LoggerFactory.getLogger(StateConductorServiceTest.class);
  static DatabaseClient client;

  StateConductorService mockService;
  StateConductorService service;

  @BeforeAll
  public static void suiteSetup() {
    client = DatabaseClientFactory.newClient("vm1", 8888, new DatabaseClientFactory.DigestAuthContext("admin", "admin"));
  }

  @BeforeEach
  public void setup() {
    mockService = new StateConductorServiceMock();
    service = StateConductorService.on(client);
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
    String[] status = { "failed", "complete" };
    String[] uris = service.getJobs(count, null, Arrays.stream(status)).toArray(String[]::new);
    assertEquals(count, uris.length);
    logger.info("URIS: {}", String.join(",", Arrays.asList(uris)));
  }

  @Test
  public void testProcessJobMock() {
    boolean resp = mockService.processJob("/test.json");
    assertEquals(true, resp);
  }

  @Test
  public void testProcessJob() {

  }

  @AfterAll
  public static void suiteTeardown() {
    if (client != null) {
      client.release();
    }
  }

}
