import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  content: string;
  display: boolean;
}

export default function EquationBlock({ content, display }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(content, ref.current, {
          displayMode: display,
          throwOnError: false,
        });
      } catch {
        if (ref.current) ref.current.textContent = content;
      }
    }
  }, [content, display]);

  return display ? (
    <div className="my-3 overflow-x-auto text-center">
      <span ref={ref} />
    </div>
  ) : (
    <span ref={ref} className="mx-1" />
  );
}
