package com.marklogic.config;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import com.marklogic.client.ext.DatabaseClientConfig;
import com.marklogic.client.ext.SecurityContextType;
import com.marklogic.client.ext.modulesloader.ssl.SimpleX509TrustManager;

import javax.net.ssl.SSLContext;
import java.security.NoSuchAlgorithmException;
import java.util.Map;

public class StateConductorDriverConfig {

  private String host = "localhost";
  private Integer port = 8000;
  private String username;
  private String password;
  private String jobsDatabase = "state-conductor-jobs";

  private SecurityContextType securityContextType = SecurityContextType.DIGEST;
  private boolean simpleSsl = false;
  private String externalName;
  private String certFile;
  private String certPassword;
  private DatabaseClient.ConnectionType connectionType = DatabaseClient.ConnectionType.DIRECT;

  private Integer threadCount = 10;
  private Integer pollSize = 1000;
  private Integer batchSize = 5;

  public DatabaseClientConfig getDatabaseClientConfig() {
    DatabaseClientConfig clientConfig = new DatabaseClientConfig();
    clientConfig.setHost(host);
    clientConfig.setPort(port);
    clientConfig.setUsername(username);
    clientConfig.setPassword(password);
    clientConfig.setSecurityContextType(securityContextType);
    clientConfig.setExternalName(externalName);
    clientConfig.setCertFile(certFile);
    clientConfig.setCertPassword(certPassword);
    clientConfig.setConnectionType(connectionType);

    if (simpleSsl == true) {
      try {
        clientConfig.setSslContext(SSLContext.getDefault());
      } catch (NoSuchAlgorithmException e) {
        throw new RuntimeException("Unable to get default SSLContext: " + e.getMessage(), e);
      }
      clientConfig.setSslHostnameVerifier(DatabaseClientFactory.SSLHostnameVerifier.ANY);
      clientConfig.setTrustManager(new SimpleX509TrustManager());
    }
    return clientConfig;
  }

  public static StateConductorDriverConfig newConfig(Map<String, String> props) {
    StateConductorDriverConfig config = new StateConductorDriverConfig();
    config.host = getPropertyValue(props, "mlHost", "localhost");
    config.port = Integer.parseInt(getPropertyValue(props, "mlPort", "8000"));
    config.username = getPropertyValue(props, "username", null);
    config.password = getPropertyValue(props, "password", null);
    config.jobsDatabase = getPropertyValue(props, "jobsDatabase", "state-conductor-jobs");
    config.securityContextType = SecurityContextType.valueOf(getPropertyValue(props, "securityContextType", "basic").toUpperCase());
    config.simpleSsl = Boolean.parseBoolean(getPropertyValue(props, "simpleSsl", "false"));
    config.externalName = getPropertyValue(props, "externalName", null);
    config.certFile = getPropertyValue(props, "certFile", null);
    config.certPassword = getPropertyValue(props, "certPassword", null);
    config.connectionType = DatabaseClient.ConnectionType.valueOf(getPropertyValue(props, "connectionType", "direct").toUpperCase());
    config.threadCount = Integer.parseInt(getPropertyValue(props, "threadCount", "10"));
    config.pollSize = Integer.parseInt(getPropertyValue(props, "pollSize", "1000"));
    config.batchSize = Integer.parseInt(getPropertyValue(props, "batchSize", "5"));
    return config;
  }

  private static String getPropertyValue(Map<String, String> props, String key, String defaultValue) {
    String value = props.get(key);
    if (value == null || value.length() == 0) {
      return defaultValue;
    }
    return value;
  }

  public Integer getThreadCount() {
    return threadCount;
  }

  public void setThreadCount(Integer threadCount) {
    this.threadCount = threadCount;
  }

  public Integer getPollSize() {
    return pollSize;
  }

  public void setPollSize(Integer pollSize) {
    this.pollSize = pollSize;
  }

  public Integer getBatchSize() {
    return batchSize;
  }

  public void setBatchSize(Integer batchSize) {
    this.batchSize = batchSize;
  }

  public String getHost() {
    return host;
  }

  public void setHost(String host) {
    this.host = host;
  }

  public Integer getPort() {
    return port;
  }

  public void setPort(Integer port) {
    this.port = port;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  public String getJobsDatabase() {
    return jobsDatabase;
  }

  public void setJobsDatabase(String jobsDatabase) {
    this.jobsDatabase = jobsDatabase;
  }
}
