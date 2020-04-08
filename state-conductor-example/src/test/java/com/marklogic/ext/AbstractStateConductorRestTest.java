package com.marklogic.ext;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.document.JSONDocumentManager;
import com.marklogic.client.ext.helper.DatabaseClientProvider;
import com.marklogic.client.io.FileHandle;
import com.marklogic.client.io.StringHandle;
import com.marklogic.junit5.AbstractMarkLogicTest;
import io.restassured.RestAssured;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.URL;
import java.nio.file.Files;
import java.util.Map;

import static io.restassured.RestAssured.given;

/**
 * Extends JUnit5 with Spring's support for tests.
 */
@ExtendWith(SpringExtension.class)

/**
 * SimpleTestConfig provides a sensible default configuration for testing applications that use ml-gradle for
 * deployment. You can override this via your own ContextConfiguration in a subclass.
 */
@ContextConfiguration(classes = {StateConductorTestConfig.class})

/**
 * Provides basic support for JUnit tests that use Spring's support for tests. A DatabaseClientProvider is expected to
 * be in the Spring container so that this class can implement its parent class's getDatabaseClient method.
 */
public abstract class AbstractStateConductorRestTest extends AbstractMarkLogicTest {

  @Autowired
  @Qualifier("databaseClientProvider")
  protected DatabaseClientProvider databaseClientProvider;

  @Override
  protected DatabaseClient getDatabaseClient() {
    return databaseClientProvider.getDatabaseClient();
  }

  @Autowired
  @Qualifier("jobsDatabaseClientProvider")
  protected DatabaseClientProvider jobsDatabaseClientProvider;

  protected DatabaseClient getJobsDatabaseClient() {
    return jobsDatabaseClientProvider.getDatabaseClient();
  }

  private JSONDocumentManager contentManager;
  protected JSONDocumentManager getContentManager() {
    if (contentManager == null) {
      contentManager = getDatabaseClient().newJSONDocumentManager();
    }
    return contentManager;
  }

  private JSONDocumentManager jobsManager;
  protected JSONDocumentManager getJobsManager() {
    if (jobsManager == null) {
      jobsManager = getJobsDatabaseClient().newJSONDocumentManager();
    }
    return jobsManager;
  }

  protected FileHandle loadFileResource(String name) throws FileNotFoundException {
    URL resource = getClass().getClassLoader().getResource(name);
    if (resource == null) {
      throw new FileNotFoundException(name);
    } else {
      File file = new File(resource.getFile());
      return new FileHandle(file);
    }
  }

  protected StringHandle loadTokenizedResource(String name, Map<String, String> tokens) throws IOException {
    URL resource = getClass().getClassLoader().getResource(name);
    if (resource == null) {
      throw new FileNotFoundException(name);
    }

    File file = new File(resource.getFile());
    String content = Files.readString(file.toPath());

    for (Map.Entry<String, String> token : tokens.entrySet()) {
      content = content.replaceAll(token.getKey(), token.getValue());
    }

    return new StringHandle(content);
  }

  protected void clearTestDatabase() {
    given().
      log().uri().
      port(8002).
      body("{\"operation\":\"clear-database\"}").
    when().
      post(String.format("/manage/v2/databases/%s", "state-conductor-example-test-content")).
    then().
      statusCode(200);
  }

}
