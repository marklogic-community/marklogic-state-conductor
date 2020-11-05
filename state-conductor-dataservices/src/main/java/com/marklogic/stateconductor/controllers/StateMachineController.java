package com.marklogic.stateconductor.controllers;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.collect.Lists;
import com.marklogic.StateConductorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

@RestController
public class StateMachineController {

  private static Logger logger = LoggerFactory.getLogger(StateMachineController.class);

  private final StateConductorService stateConductorService;

  @Autowired
  public StateMachineController(StateConductorService stateConductorService) {
    this.stateConductorService = stateConductorService;
  }

  @GetMapping("/api/hello")
  public String hello() {
    return "Hello World! - " + new Date();
  }

  @GetMapping("/api/state-machine")
  public List<String> listAllStateMachines() {
    ObjectNode result = stateConductorService.getStateMachine(null);
    List<String> names = Lists.newArrayList(result.fieldNames());
    return names;
  }

  @GetMapping("/api/state-machine/{name}")
  public ObjectNode listStateMachines(@PathVariable String name) {
    ObjectNode result = stateConductorService.getStateMachine(name);
    return result;
  }

  @GetMapping("/api/state-machine/{name}/status")
  public ObjectNode listStateMachinesStatus(
    @PathVariable String name,
    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate)
  {
    String start = null;
    if (startDate != null) {
      start = startDate.atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
      logger.info("start:{}", start);
    }

    ObjectNode result = stateConductorService.getStateMachineStatus(Arrays.stream(new String[]{ name }), start, null, false);
    return result;
  }
}
