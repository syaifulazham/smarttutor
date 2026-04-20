import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'neutral', suppressErrors: true });
let mermaidCounter = 0;

const VALID_DIAGRAM_TYPES = /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|xychart)/i;

interface Props {
  content: string;
}

export default function DiagramBlock({ content }: Props) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  const idRef = useRef(`mermaid-${++mermaidCounter}`);

  useEffect(() => {
    if (!VALID_DIAGRAM_TYPES.test(content)) {
      setError(true);
      return;
    }

    let cancelled = false;

    async function render() {
      try {
        // Validate syntax before rendering — prevents Mermaid from writing error SVG to DOM
        const valid = await mermaid.parse(content, { suppressErrors: true });
        if (!valid) { if (!cancelled) setError(true); return; }

        const { svg: rendered } = await mermaid.render(idRef.current, content);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    render();
    return () => { cancelled = true; };
  }, [content]);

  if (error) {
    return (
      <pre className="bg-gray-100 rounded p-3 text-xs text-gray-500 my-3 overflow-x-auto whitespace-pre-wrap">
        {content}
      </pre>
    );
  }

  if (!svg) return null;

  return (
    <div
      className="my-3 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
