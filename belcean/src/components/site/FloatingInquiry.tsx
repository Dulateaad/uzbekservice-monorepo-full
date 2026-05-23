'use client';

import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { useDictionary } from '@/contexts/dictionary-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { onTelLinkClick, PHONE_TEL_HREF } from '@/lib/phone-conversion';

export function FloatingInquiry() {
  const t = useDictionary();
  const tFloating = t.FloatingInquiry;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              size="icon"
              className="h-14 w-14 rounded-full bg-green-600 text-white shadow-lg animate-pulse-glow hover:bg-green-700"
            >
              <a
                href={PHONE_TEL_HREF}
                onClick={(e) => onTelLinkClick(e)}
                aria-label={tFloating.call}
              >
                <Phone className="h-7 w-7" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{tFloating.call}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
