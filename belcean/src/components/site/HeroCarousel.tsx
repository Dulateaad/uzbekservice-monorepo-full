'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function HeroCarousel({ images }: { images: any[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="absolute inset-0 w-full h-full">
      {images.map((image, index) => (
        <Image
          key={image.id || index}
          alt={image.description}
          className={cn(
            "object-cover transition-opacity duration-1000 ease-in-out",
            current === index ? "opacity-100" : "opacity-0"
          )}
          src={image.imageUrl}
          fill
          priority={true}
          data-ai-hint={image.imageHint}
        />
      ))}
    </div>
  );
}
