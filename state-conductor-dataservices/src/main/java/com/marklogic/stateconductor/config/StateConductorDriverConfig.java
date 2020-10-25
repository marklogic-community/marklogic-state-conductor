package com.marklogic.stateconductor.config;

import com.marklogic.client.DatabaseClientFactory;
import com.marklogic.client.ext.DatabaseClientConfig;
import com.marklogic.client.ext.modulesloader.ssl.SimpleX509TrustManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.net.ssl.SSLContext;
import java.security.NoSuchAlgorithmException;

public class StateConductorDriverConfig {

  private static Logger logger = LoggerFactory.getLogger(StateConductorDriverConfig.class);

  private StateConductorProperties props;

  public StateConductorDriverConfig(StateConductorProperties props) {
    this.props = props;
  }

  public DatabaseClientConfig getAppServicesDatabaseClientConfig() {
    DatabaseClientConfig clientConfig = new DatabaseClientConfig();
    clientConfig.setHost(props.getHost());
    clientConfig.setPort(props.getAppServicesPort());
    clientConfig.setUsername(props.getUsername());
    clientConfig.setPassword(props.getPassword());
    clientConfig.setSecurityContextType(props.getSecurityContextType());
    clientConfig.setExternalName(props.getExternalName());
    clientConfig.setCertFile(props.getCertFile());
    clientConfig.setCertPassword(props.getCertPassword());
    clientConfig.setConnectionType(props.getConnectionType());

    if (props.isSimpleSsl()) {
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
    clientConfig.setHost(props.getHost());
    clientConfig.setPort(props.getPort());
    clientConfig.setUsername(props.getUsername());
    clientConfig.setPassword(props.getPassword());
    clientConfig.setSecurityContextType(props.getSecurityContextType());
    clientConfig.setExternalName(props.getExternalName());
    clientConfig.setCertFile(props.getCertFile());
    clientConfig.setCertPassword(props.getCertPassword());
    clientConfig.setConnectionType(props.getConnectionType());

    if (props.isSimpleSsl()) {
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
    return props.getFixedThreadCount() > 0;
  }

  public StateConductorProperties getProperties() {
    return props;
  }
}
