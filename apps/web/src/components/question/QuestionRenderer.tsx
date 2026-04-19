import { Component, ErrorInfo, ReactNode } from 'react';
import TextBlock from './TextBlock';
import EquationBlock from './EquationBlock';
import TableBlock from './TableBlock';
import DiagramBlock from './DiagramBlock';
import ImageBlock from './ImageBlock';
import OptionsBlock from './OptionsBlock';
import type { ParsedContent, QuestionComponent } from '../../../../../packages/shared/types/question';

interface RendererProps {
  parsedContent: ParsedContent;
  questionImageUrl?: string;
  selectedOption?: string;
  onOptionSelect?: (item: string) => void;
  correctLetter?: string;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('QuestionRenderer error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Failed to render question content.
        </div>
      );
    }
    return this.props.children;
  }
}

function renderComponent(
  component: QuestionComponent,
  index: number,
  questionImageUrl?: string,
  selectedOption?: string,
  onOptionSelect?: (item: string) => void,
  correctLetter?: string
): ReactNode {
  switch (component.type) {
    case 'text':
      return <TextBlock key={index} content={component.content} />;
    case 'equation':
      return <EquationBlock key={index} content={component.content} display={component.display} />;
    case 'table':
      return <TableBlock key={index} headers={component.headers} rows={component.rows} />;
    case 'diagram_description':
      return <DiagramBlock key={index} content={component.content} />;
    case 'image_reference':
      return (
        <ImageBlock
          key={index}
          url={component.url}
          caption={component.caption}
          fallbackUrl={questionImageUrl}
        />
      );
    case 'options':
      return (
        <OptionsBlock
          key={index}
          items={component.items}
          selected={selectedOption}
          onSelect={onOptionSelect}
          correctLetter={correctLetter}
        />
      );
    default:
      return null;
  }
}

export default function QuestionRenderer({ parsedContent, questionImageUrl, selectedOption, onOptionSelect, correctLetter }: RendererProps) {
  return (
    <ErrorBoundary>
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
            {parsedContent.subject}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              parsedContent.difficulty === 'Easy'
                ? 'bg-green-100 text-green-700'
                : parsedContent.difficulty === 'Medium'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {parsedContent.difficulty}
          </span>
        </div>
        {parsedContent.components.map((comp, i) =>
          renderComponent(comp, i, questionImageUrl, selectedOption, onOptionSelect, correctLetter)
        )}
      </div>
    </ErrorBoundary>
  );
}
