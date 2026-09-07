import React, { useState } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  fallbackSrc = 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80',
  src,
  alt = '',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  if (failed || !imageSrc) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-400">
        <span className="material-symbols-outlined text-[28px]">fitness_center</span>
        <span className="mt-1 text-[10px]">Imagen no disponible</span>
      </div>
    );
  }

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt}
      onError={() => {
        if (fallbackSrc && imageSrc !== fallbackSrc) setImageSrc(fallbackSrc);
        else setFailed(true);
      }}
    />
  );
};