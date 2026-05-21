package com.app;

import com.jayway.jsonpath.JsonPath;
import org.springframework.test.web.servlet.MvcResult;

final class JsonTestUtils {

  private JsonTestUtils() {}

  static String readJson(MvcResult result, String path) throws Exception {
    return JsonPath.read(result.getResponse().getContentAsString(), path);
  }
}
