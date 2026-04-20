import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { preprocessMath, trimUnclosedMath } from '@/utils/preprocessMath';

interface Props {
  text: string;
  className?: string;
}

export default function InlineMath({ text, className }: Props) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <>{children}</>,
        }}
      >
        {preprocessMath(trimUnclosedMath(text))}
      </ReactMarkdown>
    </span>
  );
}
