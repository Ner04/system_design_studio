import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownPreviewProps = {
  markdown: string;
};

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="prose-document h-full overflow-y-auto px-8 py-7">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
