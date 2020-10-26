package com.marklogic.stateconductor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Date;

@RestController
public class TestController {

  @GetMapping("/api/hello")
  public String hello() {
    return "Hello World! - " + new Date();
  }
}
