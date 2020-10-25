package com.marklogic.stateconductor;

import com.marklogic.stateconductor.config.StateConductorDriverConfig;
import com.marklogic.stateconductor.config.StateConductorProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;

import java.util.Arrays;

@SpringBootApplication(scanBasePackages = "com.marklogic.stateconductor")
public class Application {

  StateConductorProperties stateConductorProperties;

  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }

  @Autowired
  public void setStateConductorProperties(StateConductorProperties stateConductorProperties) {
    this.stateConductorProperties = stateConductorProperties;
    System.out.println("StateConductorProperties:");
    System.out.println(stateConductorProperties.getPort());
  }

  @Bean
  public ApplicationRunner applicationRunner(ApplicationContext ctx) {
    return args -> {

      /*System.out.println("Let's inspect the beans provided by Spring Boot:");

      String[] beanNames = ctx.getBeanDefinitionNames();
      Arrays.sort(beanNames);
      for (String beanName : beanNames) {
        System.out.println(beanName);
      }*/

      StateConductorDriverConfig config = new StateConductorDriverConfig(stateConductorProperties);
      StateConductorDriver driver = new StateConductorDriver(config);
      Thread driverThread = new Thread(driver);
      driverThread.start();

      try {
        driverThread.join();
      } catch (InterruptedException e) {
        e.printStackTrace();
        driver.destroy();
      }
    };
  }
}
