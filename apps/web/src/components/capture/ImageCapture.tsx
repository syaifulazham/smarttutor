import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onSubmit: (file: File) => void;
  isLoading: boolean;
}

export default function ImageCapture({ onSubmit, isLoading }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: isLoading,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded object-contain" />
        ) : (
          <div className="text-gray-500">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm font-medium">Drop an image here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP, HEIC — max 10 MB</p>
          </div>
        )}
      </div>

      {preview && (
        <button
          onClick={() => { setPreview(null); setFile(null); }}
          className="text-xs text-gray-500 hover:text-red-500"
          disabled={isLoading}
        >
          Remove image
        </button>
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
