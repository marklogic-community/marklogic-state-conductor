package com.marklogic.ext;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marklogic.StateConductorJob;
import com.marklogic.client.DatabaseClient;
import com.marklogic.client.document.JSONDocumentManager;
import com.marklogic.client.ext.helper.DatabaseClientProvider;
import com.marklogic.client.io.FileHandle;
import com.marklogic.client.io.StringHandle;
import com.marklogic.junit5.AbstractMarkLogicTest;
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

  protected ObjectMapper mapper = new ObjectMapper();

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

  private String contentDatabaseId;
  protected String getContentDatabaseId() {
    if (contentDatabaseId == null) {
      contentDatabaseId = getDatabaseClient()
        .newServerEval()
        .xquery("xdmp:database(\"state-conductor-dataservices-test-content\")")
        .evalAs(String.class);
    }
    return contentDatabaseId;
  }

  private String modulesDatabaseId;
  protected String getModulesDatabaseId() {
    if (modulesDatabaseId == null) {
      modulesDatabaseId = getDatabaseClient()
        .newServerEval()
        .xquery("xdmp:database(\"state-conductor-dataservices-modules\")")
        .evalAs(String.class);
    }
    return modulesDatabaseId;
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

  protected StringHandle loadTokenizedResource(String name, Map<String, String> tokens) throws IOException {
    URL resource = getClass().getClassLoader().getResource(name);
    if (resource == null) {
      throw new FileNotFoundException(name);
    }

    File file = new File(resource.getFile());
    String content = new String(Files.readAllBytes(file.toPath()));

    for (Map.Entry<String, String> token : tokens.entrySet()) {
      content = content.replaceAll(token.getKey(), token.getValue());
    }

    return new StringHandle(content);
  }

  protected StateConductorJob getJobDocument(String uri) throws IOException {
    String content = getJobsManager().readAs(uri, String.class);
    return mapper.readValue(content, StateConductorJob.class);
  }

}

// cpf:restart
// cpf:any-property state-conductor-domain
// cpf:create state-conductor-domain
// cpf:delete state-conductor-domain
// cpf:state state-conductor-domain
// cpf:status state-conductor-domain
// cpf:update state-conductor-domain
