import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize once globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mermaid as any).initialize({ startOnLoad: false, theme: 'neutral', suppressErrors: true });
let mermaidCounter = 0;

interface Props {
  content: string;
}

export default function DiagramBlock({ content }: Props) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  const idRef = useRef(`mermaid-${++mermaidCounter}`);

  useEffect(() => {
    let cancelled = false;

    mermaid
      .render(idRef.current, content)
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => { cancelled = true; };
  }, [content]);

  if (error) {
    return (
      <pre className="bg-gray-100 rounded p-3 text-xs text-gray-600 my-3 overflow-x-auto">
        {content}
      </pre>
    );
  }

  return (
    <div
      className="my-3 flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
