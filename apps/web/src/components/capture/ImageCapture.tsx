import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onSubmit: (file: File) => void;
  isLoading: boolean;
}

export default function ImageCapture({ onSubmit, isLoading }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pasteHint, setPasteHint] = useState(false);

  function loadFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (f) loadFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: isLoading,
  });

  // Global paste listener — captures Ctrl+V / Cmd+V anywhere on the page
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (isLoading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const pasted = new File([blob], `paste-${Date.now()}.png`, { type: blob.type });
            loadFile(pasted);
            // Flash hint
            setPasteHint(true);
            setTimeout(() => setPasteHint(false), 1500);
          }
          break;
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isLoading]);

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : pasteHint
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded object-contain" />
        ) : (
          <div className="text-gray-500">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm font-medium">Drop an image, click to browse, or paste</p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP, HEIC — max 10 MB</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-400 text-xs">
              <kbd className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] shadow-sm">⌘</kbd>
              <span>+</span>
              <kbd className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] shadow-sm">V</kbd>
              <span>to paste from clipboard</span>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="flex items-center justify-between">
          {pasteHint && <span className="text-xs text-green-600 font-medium">Image pasted ✓</span>}
          <button
            onClick={() => { setPreview(null); setFile(null); }}
            className="text-xs text-gray-500 hover:text-red-500 ml-auto"
            disabled={isLoading}
          >
            Remove image
          </button>
        </div>
      )}

      <button
        onClick={() => file && onSubmit(file)}
        disabled={!file || isLoading}
        className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Analysing...' : 'Analyse Image'}
      </button>
    </div>
  );
}
