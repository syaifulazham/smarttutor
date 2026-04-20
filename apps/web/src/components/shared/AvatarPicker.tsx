import { useEffect } from 'react';
import { TUTOR_AVATARS } from '@/data/tutorAvatars';
import { useAvatarStore } from '@/store/avatarStore';

interface Props {
  onClose: () => void;
}

export default function AvatarPicker({ onClose }: Props) {
  const { selectedId, setAvatar } = useAvatarStore();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleSelect(id: string) {
    setAvatar(id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Choose your tutor</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pick the personality that helps you learn best</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {TUTOR_AVATARS.map((av) => {
            const isSelected = av.id === selectedId;
            return (
              <button
                key={av.id}
                onClick={() => handleSelect(av.id)}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                <img
                  src={av.url}
                  alt={av.name}
                  className="w-16 h-16 rounded-full object-cover bg-gray-100"
                />
                <span className="text-xs font-semibold text-gray-800 text-center leading-tight">{av.name}</span>
                <span className="text-[10px] text-gray-400 text-center leading-tight">{av.tagline}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
