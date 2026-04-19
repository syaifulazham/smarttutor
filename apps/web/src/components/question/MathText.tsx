import { Fragment } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  text: string;
}

// Splits a string on $...$ inline math delimiters and renders each math segment with KaTeX.
export default function MathText({ text }: Props) {
  const parts = text.split(/(\$[^$]+\$)/g);

  return (
    <Fragment>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const latex = part.slice(1, -1);
          try {
            const html = katex.renderToString(latex, { throwOnError: false, displayMode: false });
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch {
            return <span key={i}>{part}</span>;
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </Fragment>
  );
}
