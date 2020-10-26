package com.marklogic.stateconductor;

import com.marklogic.stateconductor.config.StateConductorDriverConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;

@SpringBootApplication(scanBasePackages = "com.marklogic.stateconductor")
public class Application {

  private final StateConductorDriverConfig config;

  @Autowired
  public Application(StateConductorDriverConfig config) {
    this.config = config;
  }

  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }

  @Bean
  public ApplicationRunner applicationRunner(ApplicationContext ctx) {
    return args -> {
      StateConductorDriver driver = new StateConductorDriver(config);
      Thread driverThread = new Thread(driver);
      driverThread.start();

      try {
        driverThread.join();
      } catch (InterruptedException e) {
        e.printStackTrace();
      } finally {
        driver.destroy();
        System.exit(0);
      }
    };
  }
}
