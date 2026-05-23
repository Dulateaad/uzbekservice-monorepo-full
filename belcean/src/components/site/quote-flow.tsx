'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDictionary } from '@/contexts/dictionary-context';
import { Phone } from 'lucide-react';
import { onTelLinkClick, PHONE_TEL_HREF } from '@/lib/phone-conversion';

type QuoteContextValue = {
  openQuote: () => void;
  closeQuote: () => void;
};

const QuoteContext = createContext<QuoteContextValue | null>(null);

export function useQuoteFlow() {
  const v = useContext(QuoteContext);
  if (!v) throw new Error('useQuoteFlow must be used within QuoteFlowProvider');
  return v;
}

export function QuoteFlowProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openQuote = useCallback(() => setOpen(true), []);
  const closeQuote = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openQuote, closeQuote }),
    [openQuote, closeQuote],
  );

  return (
    <QuoteContext.Provider value={value}>
      {children}
      <ServiceInfoDialog open={open} onOpenChange={setOpen} />
    </QuoteContext.Provider>
  );
}

function ServiceInfoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useDictionary();
  const info = t.InfoModal;
  const sections = (info.sections ?? []) as { title: string; body: string }[];
  const bullets = (info.bullets ?? []) as string[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-xl font-headline leading-snug">
            {info.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {info.lead ? <p className="text-foreground/90">{info.lead}</p> : null}

          {sections.map((s) => (
            <div key={s.title} className="space-y-1.5">
              <h3 className="font-semibold text-foreground">{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}

          {bullets.length > 0 ? (
            <div className="space-y-2">
              {info.bullets_title ? (
                <p className="font-semibold text-foreground">{info.bullets_title}</p>
              ) : null}
              <ul className="list-inside list-disc space-y-1.5 pl-0.5">
                {bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {info.footer_note ? <p className="text-xs sm:text-sm">{info.footer_note}</p> : null}

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
              <a href={PHONE_TEL_HREF} onClick={(e) => onTelLinkClick(e)}>
                <Phone className="h-4 w-4 shrink-0" />
                {info.phone_cta}
              </a>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              {info.close}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
