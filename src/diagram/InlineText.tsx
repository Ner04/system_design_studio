import { useEffect, useState } from "react";
import clsx from "clsx";
import { useDiagramStore } from "../store/diagramStore";

type InlineTextProps = {
  nodeId: string;
  value: string;
  placeholder: string;
  className?: string;
  /** Enter commits instead of inserting a newline. */
  singleLine?: boolean;
};

/**
 * Double-click-to-edit text used by every drawable node. Editing is committed on
 * blur so clicking away on the canvas behaves the way it does in Eraser/Figma.
 */
export function InlineText({
  nodeId,
  value,
  placeholder,
  className,
  singleLine = false,
}: InlineTextProps) {
  const updateNodeText = useDiagramStore((state) => state.updateNodeText);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => {
          updateNodeText(nodeId, draft);
          setIsEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setDraft(value);
            setIsEditing(false);
          }
          if (event.key === "Enter" && (singleLine || event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        className={clsx(
          "nodrag nowheel h-full w-full resize-none border-0 bg-transparent p-0 text-center outline-none",
          className,
        )}
      />
    );
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      title="Double-click to edit"
      className={clsx("h-full w-full cursor-text whitespace-pre-wrap break-words", className)}
    >
      {value || <span className="opacity-40">{placeholder}</span>}
    </div>
  );
}
