package com.marklogic.config;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import com.marklogic.client.ext.DatabaseClientConfig;
import com.marklogic.client.ext.SecurityContextType;
import com.marklogic.client.ext.modulesloader.ssl.SimpleX509TrustManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.net.ssl.SSLContext;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;

public class StateConductorDriverConfig {

  private static Logger logger = LoggerFactory.getLogger(StateConductorDriverConfig.class);

  private String host = "localhost";
  private Integer port = 8000;
  private String username;
  private String password;
  private String executionsDatabase = "state-conductor-executions";
  private Integer appServicesPort = 8000;
  private SecurityContextType securityContextType = SecurityContextType.DIGEST;
  private boolean simpleSsl = false;
  private String externalName;
  private String certFile;
  private String certPassword;
  private DatabaseClient.ConnectionType connectionType = DatabaseClient.ConnectionType.DIRECT;
  private boolean useFixedThreadCount = false;
  private Integer fixedThreadCount = -1;
  private Integer threadsPerHost = 16;
  private Integer maxThreadCount = 128;
  private Integer pollSize = 1000;
  private Integer batchSize = 5;
  private Integer queueThreshold = 20000;
  private Long cooldownMillis = 5000L;
  private Long pollInterval = 1000L;
  private Long metricsInterval = 5000L;

  private String names;
  private String status;

  private StateConductorDriverConfig() {
    // do nothing
  }

  public DatabaseClientConfig getAppServicesDatabaseClientConfig() {
    DatabaseClientConfig clientConfig = new DatabaseClientConfig();
    clientConfig.setHost(host);
    clientConfig.setPort(appServicesPort);
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

  protected static Map<String, String> getMergedProperties(Map<String, String>... properties) {
    Map<String, String> merged = new HashMap<>();
    for (Map<String, String> props : properties) {
      merged.putAll(props);
    }
    return merged;
  }

  public static StateConductorDriverConfig newConfig(Map<String, String>... properties) {
    // created a merged property map
    Map<String, String> props = getMergedProperties(properties);
    logger.debug("Configuration Properties: {}", props);
    // build the configuration
    StateConductorDriverConfig config = new StateConductorDriverConfig();
    config.host = getPropertyValue(props, "mlHost", "localhost");
    config.port = Integer.parseInt(getPropertyValue(props, "mlPort", "8000"));
    config.username = getPropertyValue(props, "username", null);
    config.password = getPropertyValue(props, "password", null);
    config.executionsDatabase = getPropertyValue(props, "executionsDatabase", "state-conductor-executions");
    config.appServicesPort = Integer.parseInt(getPropertyValue(props, "appServicesPort", "8000"));
    config.securityContextType = SecurityContextType.valueOf(getPropertyValue(props, "securityContextType", "basic").toUpperCase());
    config.simpleSsl = Boolean.parseBoolean(getPropertyValue(props, "simpleSsl", "false"));
    config.externalName = getPropertyValue(props, "externalName", null);
    config.certFile = getPropertyValue(props, "certFile", null);
    config.certPassword = getPropertyValue(props, "certPassword", null);
    config.connectionType = DatabaseClient.ConnectionType.valueOf(getPropertyValue(props, "connectionType", "direct").toUpperCase());
    config.pollSize = Integer.parseInt(getPropertyValue(props, "pollSize", "1000"));
    config.batchSize = Integer.parseInt(getPropertyValue(props, "batchSize", "5"));
    config.queueThreshold = Integer.parseInt(getPropertyValue(props, "queueThreshold", "20000"));
    config.cooldownMillis = Long.parseLong(getPropertyValue(props, "cooldownMillis", "5000"));
    config.pollInterval = Long.parseLong(getPropertyValue(props, "pollInterval", "1000"));
    config.metricsInterval = Long.parseLong(getPropertyValue(props, "metricsInterval", "5000"));
    config.names = getPropertyValue(props, "names", null);
    config.status = getPropertyValue(props, "status", null);
    // thread settings
    config.fixedThreadCount = Integer.parseInt(getPropertyValue(props, "fixedThreadCount", "-1"));
    config.threadsPerHost = Integer.parseInt(getPropertyValue(props, "threadsPerHost", "16"));
    config.maxThreadCount = Integer.parseInt(getPropertyValue(props, "maxThreadCount", "128"));

    if (config.fixedThreadCount > 0)
      config.useFixedThreadCount = true;

    return config;
  }

  private static String getPropertyValue(Map<String, String> props, String key, String defaultValue) {
    String value = props.get(key);
    if (value == null || value.length() == 0) {
      return defaultValue;
    }
    return value;
  }

  public boolean useFixedThreadCount() {
    return useFixedThreadCount;
  }

  public Integer getFixedThreadCount() {
    return fixedThreadCount;
  }

  public void setThreadCount(Integer threadCount) {
    this.fixedThreadCount = threadCount;
  }

  public Integer getThreadsPerHost() {
    return threadsPerHost;
  }

  public void setThreadsPerHost(Integer threadsPerHost) {
    this.threadsPerHost = threadsPerHost;
  }

  public Integer getMaxThreadCount() {
    return maxThreadCount;
  }

  public void setMaxThreadCount(Integer maxThreadCount) {
    this.maxThreadCount = maxThreadCount;
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

  public String getExecutionsDatabase() {
    return executionsDatabase;
  }

  public void setExecutionsDatabase(String executionsDatabase) {
    this.executionsDatabase = executionsDatabase;
  }

  public Integer getAppServicesPort() { return appServicesPort; }

  public void setAppServicesPort(Integer appServicesPort) { this.appServicesPort = appServicesPort; }

  public Integer getQueueThreshold() {
    return queueThreshold;
  }

  public void setQueueThreshold(Integer queueThreshold) {
    this.queueThreshold = queueThreshold;
  }

  public Long getCooldownMillis() { return cooldownMillis; }

  public void setCooldownMillis(Long cooldownMillis) { this.cooldownMillis = cooldownMillis; }

  public Long getPollInterval() {
    return pollInterval;
  }

  public void setPollInterval(Long pollInterval) {
    this.pollInterval = pollInterval;
  }

  public Long getMetricsInterval() {
    return metricsInterval;
  }

  public void setMetricsInterval(Long metricsInterval) {
    this.metricsInterval = metricsInterval;
  }

  public String getStateMachineNames() { return names; }

  public void setStateMachineNames(String names) { this.names = names; }

  public String getStateMachineStatus() { return status; }

  public void setStateMachineStatus(String status) { this.status = status; }
}
