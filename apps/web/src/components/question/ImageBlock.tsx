import { useState } from 'react';

interface Props {
  url: string;
  caption?: string;
  fallbackUrl?: string;
}

export default function ImageBlock({ url, caption, fallbackUrl }: Props) {
  const [src, setSrc] = useState(url);
  const [failed, setFailed] = useState(false);

  function handleError() {
    if (fallbackUrl && src !== fallbackUrl) {
      setSrc(fallbackUrl);
    } else {
      setFailed(true);
    }
  }

  if (failed) {
    return (
      <div className="my-3 rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-400 text-center">
        Image unavailable
      </div>
    );
  }

  return (
    <figure className="my-3">
      <img
        src={src}
        alt={caption ?? 'Question image'}
        onError={handleError}
        className="max-w-full rounded border border-gray-200"
      />
      {caption && caption !== 'Source image' && (
        <figcaption className="text-xs text-gray-500 mt-1 text-center">{caption}</figcaption>
      )}
    </figure>
  );
}
