package com.marklogic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;

import java.util.*;
import java.util.stream.Stream;

public class StateConductorServiceMock implements StateConductorService {

  @Override
  public Stream<String> getJobs(Integer count, String flowNames, Stream<String> flowStatus, Stream<String> forestIds) {
    List<String> uris = new ArrayList<>();
    for (int i = 1; i <= count; i++) {
      uris.add(String.format("/test/test%s.json", i));
    }
    return uris.stream();
  }

  @Override
  public String createJob(String uri, String flowName) {
    return UUID.randomUUID().toString();
  }

  @Override
  public ArrayNode processJob(Stream<String> uri) {
    ArrayNode arr = new ArrayNode(JsonNodeFactory.instance);

    uri.forEach(value -> {
      Map<String, JsonNode> vals = new HashMap<>();
      vals.put("job", new TextNode(value));
      vals.put("result", BooleanNode.getTrue());
      arr.add(new ObjectNode(JsonNodeFactory.instance, vals));
    });

    return arr;
  }

  @Override
  public ObjectNode getFlowStatus(Stream<String> flowNames, String startDate, String endDate, Boolean detailed) {
    ObjectNode obj = new ObjectNode(JsonNodeFactory.instance);

    flowNames.forEach(flowName -> {
      ObjectNode flowStatus = new ObjectNode(JsonNodeFactory.instance);
      flowStatus.put("flowName", flowName);
      flowStatus.put("totalPerStatus", "");
      flowStatus.put("totalPerState", "");
      obj.set(flowName, flowStatus);
    });

    return obj;
  }

}
