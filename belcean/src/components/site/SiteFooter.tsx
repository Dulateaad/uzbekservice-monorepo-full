
'use client';
import Link from 'next/link';
import { Logo } from './Logo';
import { Instagram } from 'lucide-react';
import { onTelLinkClick, PHONE_TEL_HREF } from '@/lib/phone-conversion';
import { useDictionary } from '@/contexts/dictionary-context';
import * as constants from '@/lib/constants';
import { usePathname } from 'next/navigation';
import { i18n } from '@/i18n-config';
import { useEffect, useState } from 'react';

export function SiteFooter() {
  const t = useDictionary();
  const services = constants.getServices(t);
  const pathname = usePathname();
  const currentLocale = pathname.split('/')[1] || i18n.defaultLocale;

  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full border-t bg-secondary">
      <div className="container py-12">
        <div className="grid gap-12 md:gap-8 md:grid-cols-4 text-center md:text-left">
          <div className="space-y-4 md:col-span-2 flex flex-col items-center md:items-start">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-sm">
              {t.Footer.description}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-lg">{t.Footer.services}</h4>
            <ul className="space-y-2">
              {services.map((service: any) => (
                <li key={service.slug}>
                  <Link href={`/${currentLocale}${service.slug}`} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-lg">{t.Footer.contacts}</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t.Footer.address}</p>
              <p>
                <a href="mailto:info@beclean.pro" className="hover:text-primary hover:underline">info@beclean.pro</a>
              </p>
              <p>
                <a
                  href={PHONE_TEL_HREF}
                  onClick={(e) => onTelLinkClick(e)}
                  className="hover:text-primary hover:underline font-semibold"
                >
                  +998 77 356 60 70
                </a>
              </p>
               <div className="flex space-x-4 pt-4 justify-center md:justify-start">
                <Link href="https://www.instagram.com/beclean_servic?igsh=OTlpZXg3ODlrZnYw" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <Instagram className="h-6 w-6 text-muted-foreground hover:text-primary" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground min-h-[20px]">
          {year && <p>{t.Footer.copyright.replace('{year}', String(year))}</p>}
        </div>
      </div>
    </footer>
  );
}
