import { useState } from 'react';

interface Props {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export default function TextCapture({ onSubmit, isLoading }: Props) {
  const [text, setText] = useState('');

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste your question here..."
        rows={6}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        disabled={isLoading}
      />
      <button
        onClick={() => onSubmit(text)}
        disabled={text.trim().length < 5 || isLoading}
        className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Analysing...' : 'Analyse Question'}
      </button>
    </div>
  );
}
