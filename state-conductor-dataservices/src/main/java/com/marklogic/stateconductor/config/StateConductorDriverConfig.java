package com.marklogic.stateconductor.config;

import com.marklogic.client.DatabaseClient;
import com.marklogic.client.DatabaseClientFactory;
import com.marklogic.client.ext.DatabaseClientConfig;
import com.marklogic.client.ext.SecurityContextType;
import com.marklogic.client.ext.modulesloader.ssl.SimpleX509TrustManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.net.ssl.SSLContext;
import java.security.NoSuchAlgorithmException;

@Component
public class StateConductorDriverConfig {

  private static Logger logger = LoggerFactory.getLogger(StateConductorDriverConfig.class);

  @Value("${mlHost}")
  private String host = "localhost";
  @Value("${mlPort}")
  private Integer port = 8000;
  @Value("${username}")
  private String username;
  @Value("${password}")
  private String password;
  @Value("${executionsDatabase}")
  private String executionsDatabase = "state-conductor-executions";
  @Value("${appServicesPort}")
  private Integer appServicesPort = 8000;
  @Value("${securityContextType}")
  private SecurityContextType securityContextType = SecurityContextType.DIGEST;
  @Value("${simpleSsl}")
  private boolean simpleSsl = false;
  @Value("${externalName}")
  private String externalName;
  @Value("${certFile}")
  private String certFile;
  @Value("${certPassword}")
  private String certPassword;
  @Value("${connectionType}")
  private DatabaseClient.ConnectionType connectionType = DatabaseClient.ConnectionType.DIRECT;
  @Value("${fixedThreadCount}")
  private Integer fixedThreadCount = -1;
  @Value("${threadsPerHost}")
  private Integer threadsPerHost = 16;
  @Value("${maxThreadCount}")
  private Integer maxThreadCount = 128;
  @Value("${pollSize}")
  private Integer pollSize = 1000;
  @Value("${batchSize}")
  private Integer batchSize = 5;
  @Value("${queueThreshold}")
  private Integer queueThreshold = 20000;
  @Value("${cooldownMillis}")
  private Long cooldownMillis = 5000L;
  @Value("${pollInterval}")
  private Long pollInterval = 1000L;
  @Value("${metricsInterval}")
  private Long metricsInterval = 5000L;
  @Value("${names}")
  private String names;
  @Value("${status}")
  private String status;

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

    if (simpleSsl) {
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

    if (simpleSsl) {
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

  public boolean useFixedThreadCount() {
    return fixedThreadCount > 0;
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

  public Integer getAppServicesPort() {
    return appServicesPort;
  }

  public void setAppServicesPort(Integer appServicesPort) {
    this.appServicesPort = appServicesPort;
  }

  public SecurityContextType getSecurityContextType() {
    return securityContextType;
  }

  public void setSecurityContextType(SecurityContextType securityContextType) {
    this.securityContextType = securityContextType;
  }

  public boolean isSimpleSsl() {
    return simpleSsl;
  }

  public void setSimpleSsl(boolean simpleSsl) {
    this.simpleSsl = simpleSsl;
  }

  public String getExternalName() {
    return externalName;
  }

  public void setExternalName(String externalName) {
    this.externalName = externalName;
  }

  public String getCertFile() {
    return certFile;
  }

  public void setCertFile(String certFile) {
    this.certFile = certFile;
  }

  public String getCertPassword() {
    return certPassword;
  }

  public void setCertPassword(String certPassword) {
    this.certPassword = certPassword;
  }

  public DatabaseClient.ConnectionType getConnectionType() {
    return connectionType;
  }

  public void setConnectionType(DatabaseClient.ConnectionType connectionType) {
    this.connectionType = connectionType;
  }

  public Integer getFixedThreadCount() {
    return fixedThreadCount;
  }

  public void setFixedThreadCount(Integer fixedThreadCount) {
    this.fixedThreadCount = fixedThreadCount;
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

  public Integer getQueueThreshold() {
    return queueThreshold;
  }

  public void setQueueThreshold(Integer queueThreshold) {
    this.queueThreshold = queueThreshold;
  }

  public Long getCooldownMillis() {
    return cooldownMillis;
  }

  public void setCooldownMillis(Long cooldownMillis) {
    this.cooldownMillis = cooldownMillis;
  }

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

  public String getNames() {
    return names;
  }

  public void setNames(String names) {
    this.names = names;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
