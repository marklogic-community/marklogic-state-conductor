package com.marklogic.stateconductor.tasks;

import com.marklogic.StateConductorService;
import com.marklogic.stateconductor.config.StateConductorDriverConfig;
import com.marklogic.stateconductor.exceptions.CreateExecutionsTaskException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

public class FindStateMachineTargetsTask implements Runnable {

  private static Logger logger = LoggerFactory.getLogger(FindStateMachineTargetsTask.class);

  private StateConductorDriverConfig config;
  private StateConductorService service;
  private ThreadPoolExecutor pool;
  private String stateMachine;
  private String database;
  private String modules;
  private Set<String> urisBuffer = new HashSet<>();
  private List<Future<List>> results = new ArrayList<>();

  public FindStateMachineTargetsTask(StateConductorService service, StateConductorDriverConfig config, ThreadPoolExecutor pool, String stateMachine, String database, String modules) {
    this.service = service;
    this.config = config;
    this.pool = pool;
    this.stateMachine = stateMachine;
    this.database = database;
    this.modules = modules;
  }

  public Stream<String> FindTargets(int start) {
    Stream<String> targetUris = null;

    try {
      logger.info("Finding State Machine \"{}\" targets...", stateMachine);
      targetUris = service.findStateMachineTargets(stateMachine, start, config.getPollSize(), database);
    } catch (Exception ex) {
      logger.error("An error occurred finding state machine '{}' targets: {}", stateMachine, ex.getMessage());
      ex.printStackTrace();
      targetUris = Stream.empty();
    }

    return targetUris;
  }

  @Override
  public void run() {
    int start = 1;
    long emptyCount = 0;
    AtomicInteger totalFound = new AtomicInteger();
    AtomicLong totalNew = new AtomicLong();
    List<Future> completed = new ArrayList<>();
    List<String> targetUris = new ArrayList<>();

    while (true) {
      totalFound.set(0);
      totalNew.set(0);
      targetUris.clear();

      Stream<String> respUris = FindTargets(start);
      Iterator<String> it = respUris.iterator();
      while (it.hasNext()) {
        String uri = it.next();
        totalFound.incrementAndGet();
        // do we know about this one already?
        if (!urisBuffer.contains(uri)) {
          totalNew.incrementAndGet();
          targetUris.add(uri);
          urisBuffer.add(uri);
          logger.trace("found new {} target: {}", stateMachine, uri);
        } else {
          logger.trace("known {} target: {}", stateMachine, uri);
        }
      }

      if (totalFound.get() != totalNew.get()) {
        logger.info("FindStateMachineTargetsTask found {} new targets, out of {} total, for \"{}\"", totalNew.get(), totalFound.get(), stateMachine);
      } else {
        logger.info("FindStateMachineTargetsTask found {} new targets, for \"{}\"", totalNew.get(), stateMachine);
      }

      // submit create execution tasks to pool
      if (totalNew.get() > 0) {
        synchronized (pool) {
          //String[] targets = targetUris.toArray();
          //for (int i = 0; i < targetUris.size(); i += config.getCreateExecutionsCount()) {
          //  Arrays.copyOfRange(targetUris, i, config.getCreateExecutionsCount());
            Future<List> future = pool.submit(new CreateExecutionsTask(service, stateMachine, database, modules, targetUris));
            results.add(future);
          //}
        }
      }

      // process any results that have come in
      for (Future<List> future : results) {
        if (future.isDone()) {
          try {
            List<String> targets = future.get();
            urisBuffer.removeAll(targets);
          } catch (Exception e) {
            Throwable cause = e.getCause();
            if (cause instanceof CreateExecutionsTaskException) {
              CreateExecutionsTaskException cex = (CreateExecutionsTaskException) cause;
              logger.error("error creating executions for {}, uris: {}", stateMachine, cex.getTargetUris());
              logger.error("CreateExecutionsTaskException", cause);
              urisBuffer.removeAll(cex.getTargetUris());
            } else {
              logger.error("error retrieving create execution results", e);
            }
          } finally {
            completed.add(future);
          }
        }
      }

      completed.forEach(future -> results.remove(future));
      completed.clear();

      try {
        if (totalFound.get() == config.getPollSize()) {
          // request next page
          start += config.getPollSize();
          emptyCount = 0;
          logger.debug("FindStateMachineTargetsTask requesting next page...");
          Thread.sleep(10L);
        } else {
          start = 1;
          emptyCount = (totalNew.get() == 0) ? emptyCount + 1 : 0;

          if (emptyCount > 3) {
            logger.info("FindStateMachineTargetsTask cooldown...");
            Thread.sleep(config.getCooldownMillis());
          } else {
            Thread.sleep(config.getCreateExecutionsInterval());
          }
        }
      } catch (InterruptedException e) {
        logger.info("Stopping FindStateMachineTargetsTask Thread...");
        Thread.currentThread().interrupt();
        break;
      }
    }
  }
}
