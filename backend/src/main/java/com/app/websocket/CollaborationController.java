package com.app.websocket;

import com.app.dto.RealtimeDiagramEvent;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class CollaborationController {

  @MessageMapping("/diagram/{diagramId}/sync")
  @SendTo("/topic/diagram/{diagramId}")
  public RealtimeDiagramEvent sync(
      @DestinationVariable String diagramId, RealtimeDiagramEvent event) {
    return event;
  }
}
