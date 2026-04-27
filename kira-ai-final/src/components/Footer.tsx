
import { cn } from "@/lib/utils";
import Link from "next/link";

export function Footer() {
  return (
    <footer className={cn("bg-secondary/50 py-12 border-t mt-12")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-6">
        <Link href="/" className="flex flex-col items-center gap-2">
            <span className="text-2xl font-headline font-normal text-foreground tracking-[0.2em]">
                KIRA AI
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-body">Dress with intuition</span>
        </Link>
        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} KIRA AI. Все права защищены.
        </p>
      </div>
    </footer>
  );
}
