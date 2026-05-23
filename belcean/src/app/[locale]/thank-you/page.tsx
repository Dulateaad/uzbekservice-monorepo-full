
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone, Send, Clock } from "lucide-react";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getDictionary } from "@/lib/get-dictionary";
import { Locale } from "@/i18n-config";

export default async function ThankYouPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const thankYouImage = PlaceHolderImages.find(p => p.id === 'thank-you');
  const t = await getDictionary(locale);
  const pageData = t.ThankYouPage;

  return (
    <div className="container flex-grow flex items-center justify-center py-12 md:py-24">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-center max-w-4xl mx-auto">
        <div className="text-center md:text-left">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto md:mx-0 mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold font-headline mb-4">
            {pageData.title}
          </h1>
          <div className="flex items-center gap-2 mb-8 text-primary font-bold text-lg justify-center md:justify-start">
             <Clock className="w-6 h-6" />
             <p>{pageData.subtitle}</p>
          </div>
          
          <div className="bg-secondary/50 p-6 rounded-xl border mb-8 space-y-4">
            <p className="font-semibold text-lg">{pageData.contact_prefix}</p>
            <div className="flex flex-col gap-3">
              <a href="tel:+998773566070" className="flex items-center gap-3 text-xl font-bold hover:text-primary transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <span>+998 77 356 60 70</span>
              </a>
              <a href="https://t.me/beclean_manager" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xl font-bold text-[#229ED9] hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-[#229ED9]/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-[#229ED9]" />
                </div>
                <span>@beclean_manager</span>
              </a>
            </div>
          </div>

          <Button asChild variant="outline" size="lg">
            <Link href={`/${locale}`}>{pageData.button}</Link>
          </Button>
        </div>
        <div className="hidden md:block">
          {thankYouImage && (
            <Image
              alt="Thank you"
              className="rounded-lg object-cover w-full aspect-video shadow-lg"
              height="310"
              src={thankYouImage.imageUrl}
              width="550"
              data-ai-hint={thankYouImage.imageHint}
            />
          )}
        </div>
      </div>
    </div>
  );
}
