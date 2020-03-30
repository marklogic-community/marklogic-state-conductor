package com.marklogic;

import java.util.List;
import java.util.ArrayList;
import java.util.stream.Stream;

public class StateConductorServiceMock implements StateConductorService {

  @Override
  public Stream<String> getJobs(Integer count, String flowNames, Stream<String> flowStatus) {
    List<String> uris = new ArrayList<>();
    for (int i = 1; i <= count; i++) {
      uris.add(String.format("/test/test%s.json", i));
    }
    return uris.stream();
  }

  @Override
  public Boolean processJob(String uri) {
    return true;
  }

}
