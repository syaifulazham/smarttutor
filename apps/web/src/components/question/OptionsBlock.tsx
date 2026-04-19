import MathText from './MathText';

interface Props {
  items: string[];
  selected?: string;
  onSelect?: (item: string) => void;
  correctLetter?: string;
}

export default function OptionsBlock({ items, selected, onSelect, correctLetter }: Props) {
  return (
    <ul className="my-3 space-y-2">
      {items.map((item, i) => {
        const letter = item.trim().charAt(0).toUpperCase();
        const isCorrect = correctLetter && letter === correctLetter.toUpperCase();
        return (
          <li key={i}>
            <button
              onClick={() => onSelect?.(item)}
              className={`w-full text-left px-4 py-2 rounded border transition-colors text-sm ${
                isCorrect
                  ? 'border-green-500 bg-green-50 text-green-800 font-semibold ring-2 ring-green-400'
                  : selected === item
                  ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <MathText text={item} />
                {isCorrect && (
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
