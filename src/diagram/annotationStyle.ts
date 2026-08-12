import type { AnnotationTone, ShapeKind } from "../types/diagram";

type ToneVisual = {
  label: string;
  /** Body fill + border for shapes drawn on the canvas. */
  surface: string;
  /** Saturated fill used by sticky notes, which read as paper rather than glass. */
  paper: string;
  /** Swatch shown in the inspector tone picker. */
  swatch: string;
};

export const annotationTones: Record<AnnotationTone, ToneVisual> = {
  slate: {
    label: "Slate",
    surface: "border-slate-300/35 bg-slate-400/10 text-slate-100",
    paper: "border-slate-300/30 bg-slate-400/25 text-slate-50",
    swatch: "bg-slate-400",
  },
  blue: {
    label: "Blue",
    surface: "border-sky-400/45 bg-sky-500/15 text-sky-50",
    paper: "border-sky-300/35 bg-sky-500/30 text-sky-50",
    swatch: "bg-sky-400",
  },
  green: {
    label: "Green",
    surface: "border-emerald-400/45 bg-emerald-500/15 text-emerald-50",
    paper: "border-emerald-300/35 bg-emerald-500/30 text-emerald-50",
    swatch: "bg-emerald-400",
  },
  amber: {
    label: "Amber",
    surface: "border-amber-400/45 bg-amber-500/15 text-amber-50",
    paper: "border-amber-300/35 bg-amber-500/30 text-amber-50",
    swatch: "bg-amber-400",
  },
  rose: {
    label: "Rose",
    surface: "border-rose-400/45 bg-rose-500/15 text-rose-50",
    paper: "border-rose-300/35 bg-rose-500/30 text-rose-50",
    swatch: "bg-rose-400",
  },
  violet: {
    label: "Violet",
    surface: "border-violet-400/45 bg-violet-500/15 text-violet-50",
    paper: "border-violet-300/35 bg-violet-500/30 text-violet-50",
    swatch: "bg-violet-400",
  },
};

export const annotationToneKeys = Object.keys(annotationTones) as AnnotationTone[];

/**
 * Circles and diamonds are drawn by reshaping a plain box: a circle is a fully
 * rounded box, a diamond is a rotated square whose label counter-rotates.
 */
export const shapeRadiusClasses: Record<ShapeKind, string> = {
  rectangle: "rounded-none",
  roundedRectangle: "rounded-xl",
  circle: "rounded-full",
  diamond: "rounded-[6px]",
};

export const defaultShapeSize: Record<ShapeKind, { width: number; height: number }> = {
  rectangle: { width: 180, height: 108 },
  roundedRectangle: { width: 180, height: 108 },
  circle: { width: 144, height: 144 },
  diamond: { width: 144, height: 144 },
};

export const annotationLabels: Record<string, string> = {
  shape: "Shape",
  text: "Text",
  sticky: "Sticky Note",
  comment: "Comment",
  image: "Image",
  frame: "Frame",
};
