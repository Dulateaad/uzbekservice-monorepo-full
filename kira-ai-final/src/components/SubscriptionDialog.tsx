'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SubscriptionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubscribe: () => void;
}

export function SubscriptionDialog({ isOpen, onOpenChange, onSubscribe }: SubscriptionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl leading-snug">
            ✨ Лимит генераций достигнут
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 pt-2 text-left text-sm text-muted-foreground">
              <p className="text-foreground/90">
                Вы уже в числе первых пользователей KIRA 🤍
              </p>
              <p>Скоро откроем PRO-доступ:</p>
              <ul className="list-none space-y-1.5 pl-0">
                <li>– больше примерок</li>
                <li>– больше видео</li>
                <li>– кинематографичные миры и сценарии перевоплощения</li>
              </ul>
              <p className="text-foreground/90">
                Оставьте заявку, чтобы получить доступ раньше всех
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-stretch">
          <Button
            onClick={() => {
              onSubscribe();
              onOpenChange(false);
            }}
            className="w-full"
            size="lg"
          >
            ✨ Получить ранний доступ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
