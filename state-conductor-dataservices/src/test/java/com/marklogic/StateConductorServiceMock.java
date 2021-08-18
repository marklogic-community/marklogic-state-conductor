package com.marklogic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;

import java.io.Reader;
import java.util.*;
import java.util.stream.Stream;

public class StateConductorServiceMock implements StateConductorService {

  @Override
  public Stream<String> getExecutions(Integer start, Integer count, String names, Stream<String> status,
      Stream<String> forestIds, String startDate, String endDate) {
    List<String> uris = new ArrayList<>();
    for (int i = 1; i <= count; i++) {
      uris.add(String.format("/test/test%s.json", i));
    }
    return uris.stream();
  }

  @Override
  public String createExecution(String uri, String name) {
    return UUID.randomUUID().toString();
  }

  @Override
  public ArrayNode processExecution(Stream<String> uri) {
    ArrayNode arr = new ArrayNode(JsonNodeFactory.instance);

    uri.forEach(value -> {
      Map<String, JsonNode> vals = new HashMap<>();
      vals.put("execution", new TextNode(value));
      vals.put("result", BooleanNode.getTrue());
      arr.add(new ObjectNode(JsonNodeFactory.instance, vals));
    });

    return arr;
  }

  @Override
  public ObjectNode getStateMachineStatus(Stream<String> names, String startDate, String endDate, Boolean detailed) {
    ObjectNode obj = new ObjectNode(JsonNodeFactory.instance);

    names.forEach(name -> {
      ObjectNode status = new ObjectNode(JsonNodeFactory.instance);
      status.put("name", name);
      status.put("totalPerStatus", "");
      status.put("totalPerState", "");
      obj.set(name, status);
    });

    return obj;
  }

  @Override
  public com.fasterxml.jackson.databind.node.ObjectNode getStateMachine(String name) {
    // TODO Auto-generated method stub

    ObjectNode obj = new ObjectNode(JsonNodeFactory.instance);
    return obj;
  }

  @Override
  public String createStateMachine(String name, ObjectNode stateMachine) {
    return String.format("/state-conductor-definition/%s.asl.json", name);
  }

  @Override
  public void deleteStateMachine(String name) {
    // TODO Auto-generated method stub
  }

  @Override
  public ObjectNode createStateMachineExecutions(String name, Integer count, String databaseName) {
    ObjectNode obj = new ObjectNode(JsonNodeFactory.instance);
    obj.set("name", JsonNodeFactory.instance.textNode(name));
    obj.set("total", JsonNodeFactory.instance.numberNode(count));
    obj.set("executions", JsonNodeFactory.instance.objectNode());
    return obj;
  }

  @Override
  public Stream<String> findStateMachineTargets(String name, Integer count, String databaseName) {
    List<String> uris = new ArrayList<>();
    for (int i = 1; i <= count; i++) {
      uris.add(String.format("/test/test%s.json", i));
    }
    return uris.stream();
  }
}
