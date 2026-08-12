import type { CanvasTool } from "./EraserToolRail";
import type { ShapeKind } from "../types/diagram";
import { defaultShapeSize } from "./annotationStyle";

/** Tools that create something by clicking or dragging on empty canvas. */
export const drawTools: CanvasTool[] = [
  "rectangle",
  "roundedRectangle",
  "circle",
  "diamond",
  "frame",
  "text",
  "stickyNote",
  "comment",
  "image",
];

export function isDrawTool(tool: CanvasTool) {
  return drawTools.includes(tool);
}

export const shapeKinds: Partial<Record<CanvasTool, ShapeKind>> = {
  rectangle: "rectangle",
  roundedRectangle: "roundedRectangle",
  circle: "circle",
  diamond: "diamond",
};

/** Size used when a tool is clicked rather than dragged out. */
export const clickSizes: Partial<Record<CanvasTool, { width: number; height: number }>> = {
  ...defaultShapeSize,
  frame: { width: 420, height: 300 },
  text: { width: 220, height: 40 },
  stickyNote: { width: 168, height: 168 },
  comment: { width: 224, height: 112 },
  image: { width: 260, height: 180 },
};
