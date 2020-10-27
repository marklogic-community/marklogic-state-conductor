package com.marklogic.stateconductor;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.collect.Lists;
import com.marklogic.StateConductorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Date;
import java.util.List;

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
  public ObjectNode listStateMachinesStatus(@PathVariable String name) {
    ObjectNode result = stateConductorService.getStateMachineStatus(Arrays.stream(new String[]{ name }), null, null, false);
    return result;
  }
}
