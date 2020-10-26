package com.marklogic.stateconductor.tasks;

import com.marklogic.stateconductor.config.StateConductorDriverConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.atomic.AtomicLong;

public class MetricsTask implements Runnable {

  Logger logger = LoggerFactory.getLogger(MetricsTask.class);

  private StateConductorDriverConfig config;
  private AtomicLong total;
  private AtomicLong errorCount;
  private long previous = 0L;

  public MetricsTask(StateConductorDriverConfig config, AtomicLong total, AtomicLong errorCount) {
    this.config = config;
    this.total = total;
    this.errorCount = errorCount;
  }

  public void generateReport() {
    long current = total.get();
    long delta = current - previous;

    double rate = (double)delta / config.getMetricsInterval() * 1000L;

    logger.info("Processed {} transitions, with {} errors.  Current rate {} transitions/second", total.get(), errorCount.get(), rate);

    previous = current;
  }

  @Override
  public void run() {
    while (true) {

      generateReport();

      try {
        Thread.sleep(config.getMetricsInterval());
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        break;
      }
    }
  }

}
