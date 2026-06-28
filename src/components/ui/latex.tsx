"use client";
import katex from "katex";

// Splits text on $$...$$ (display) and $...$ (inline) and renders each part.
export function LatexText({ text, className }: { text: string; className?: string }) {
  const parts: Array<{ type: "text" | "inline" | "display"; content: string }> = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("$$")) {
      parts.push({ type: "display", content: raw.slice(2, -2) });
    } else {
      parts.push({ type: "inline", content: raw.slice(1, -1) });
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") return <span key={i}>{part.content}</span>;
        try {
          const html = katex.renderToString(part.content, {
            displayMode: part.type === "display",
            throwOnError: false,
            strict: false,
          });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i}>{`$${part.content}$`}</span>;
        }
      })}
    </span>
  );
}
