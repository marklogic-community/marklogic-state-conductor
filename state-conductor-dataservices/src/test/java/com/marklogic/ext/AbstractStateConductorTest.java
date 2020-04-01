package com.marklogic.ext;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marklogic.StateConductorJob;
import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import com.marklogic.client.document.JSONDocumentManager;
import com.marklogic.client.ext.helper.DatabaseClientProvider;
import com.marklogic.client.io.FileHandle;
import com.marklogic.junit5.AbstractMarkLogicTest;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.URL;

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
public abstract class AbstractStateConductorTest extends AbstractMarkLogicTest {

	@Autowired
	protected DatabaseClientProvider databaseClientProvider;

	@Override
	protected DatabaseClient getDatabaseClient() {
		return databaseClientProvider.getDatabaseClient();
	}

  protected ObjectMapper mapper = new ObjectMapper();

	// TODO pull config from properties
	protected DatabaseClient jobsClient = DatabaseClientFactory.newClient("vm1", 8886, "state-conductor-jobs", new DatabaseClientFactory.DigestAuthContext("admin", "admin"));

  protected JSONDocumentManager contentManager;
  protected JSONDocumentManager getContentManager() {
    if (contentManager == null) {
      contentManager = getDatabaseClient().newJSONDocumentManager();
    }
    return contentManager;
  }

  protected JSONDocumentManager jobsManager;
  protected JSONDocumentManager getJobsManager() {
    if (jobsManager == null) {
      jobsManager = jobsClient.newJSONDocumentManager();
    }
    return jobsManager;
  }

  /*
  @AfterAll
  public static void suiteTeardown() {
    if (jobsClient != null) {
      jobsClient.release();
    }
  }
  */

  protected FileHandle loadFileResource(String name) throws FileNotFoundException {
    URL resource = getClass().getClassLoader().getResource(name);
    if (resource == null) {
      throw new FileNotFoundException(name);
    } else {
      File file = new File(resource.getFile());
      return new FileHandle(file);
    }
  }

  protected StateConductorJob getJobDocument(String uri) throws IOException {
    String content = getJobsManager().readAs(uri, String.class);
    return mapper.readValue(content, StateConductorJob.class);
  }

}
