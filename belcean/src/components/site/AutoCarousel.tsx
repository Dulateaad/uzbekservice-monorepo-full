'use client';

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { Carousel } from "@/components/ui/carousel";

interface AutoCarouselProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  opts?: any;
}

export function AutoCarousel({ children, className, delay = 4000, opts }: AutoCarouselProps) {
  const plugin = React.useRef(
    Autoplay({ delay, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  return (
    <Carousel
      plugins={[plugin.current]}
      className={className}
      opts={{
        align: "start",
        loop: true,
        ...opts
      }}
    >
      {children}
    </Carousel>
  );
}