package com.marklogic.stateconductor;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marklogic.StateConductorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Date;

@RestController
public class TestController {

  private final StateConductorService stateConductorService;

  @Autowired
  public TestController(StateConductorService stateConductorService) {
    this.stateConductorService = stateConductorService;
  }

  @GetMapping("/api/hello")
  public String hello() {
    return "Hello World! - " + new Date();
  }

  @GetMapping("/api/state-machine")
  public ObjectNode listAllStateMachines() {
    ObjectNode result = stateConductorService.getStateMachine(null);
    return result;
  }

  @GetMapping("/api/state-machine/{name}")
  public ObjectNode listStateMachines(@PathVariable String name) {
    ObjectNode result = stateConductorService.getStateMachine(name);
    return result;
  }
}
