
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ListChecks } from 'lucide-react';
import { ContactForm } from '@/components/site/ContactForm';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getDictionary } from '@/lib/get-dictionary';
import * as constants from '@/lib/constants';
import type { Locale } from '@/i18n-config';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getDictionary(locale);
  const pageData = t.ServicePageMoikaOkon;
  return {
    title: pageData.meta_title,
    description: pageData.meta_description,
  };
}

export default async function ServicePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getDictionary(locale);
  const pageData = t.ServicePageMoikaOkon;
  const prices = constants.getPrices(t);
  const priceItem = prices.find(p => p.name.includes(t.Constants.services[4].title));
  const serviceImage = PlaceHolderImages.find(p => p.id === 'service-windows');

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-24">
         <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-start">
              <div>
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl font-headline mb-4">{pageData.service_name}</h1>
                  <p className="text-xl text-muted-foreground">
                      {pageData.service_subtitle}
                  </p>
              </div>
              {serviceImage && (
                  <Image
                  alt={pageData.service_name}
                  className="rounded-xl object-cover w-full aspect-video shadow-lg"
                  height={400}
                  src={serviceImage.imageUrl}
                  width={600}
                  data-ai-hint={serviceImage.imageHint}
                  />
              )}
         </div>

        <div className="grid md:grid-cols-3 gap-12 mt-16 md:mt-24">
          <div className="md:col-span-2">
            <section id="included" className="mb-12">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3"><ListChecks className="w-8 h-8 text-primary"/>{t.ServicePages.included_title}</h2>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {pageData.whats_included.map((item: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section id="process" className="mb-12">
              <h2 className="text-3xl font-bold mb-6">{t.ServicePages.process_title}</h2>
              <div className="flex flex-col gap-6">
                   {pageData.work_process.map((step: any, index: number) => (
                       <div key={index} className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">{index + 1}</div>
                          <div>
                              <h3 className="font-semibold text-lg">{step.title}</h3>
                              <p className="text-muted-foreground">{step.description}</p>
                          </div>
                       </div>
                   ))}
              </div>
            </section>

            <section id="faq">
              <h2 className="text-3xl font-bold mb-6">{t.ServicePages.faq_title}</h2>
              <Accordion type="single" collapsible className="w-full">
                {pageData.faq.map((item: any, index: number) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-lg">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-base">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </div>

          <aside className="md:col-span-1 space-y-8 sticky top-24 self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{t.ServicePages.price_title}</CardTitle>
              </CardHeader>
              <CardContent>
                  {priceItem && (
                      <div className="space-y-2">
                          <p className="text-lg">{priceItem.name}</p>
                          <p className="text-3xl font-bold text-primary">{priceItem.price}</p>
                      </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">{t.ServicePages.price_postfix_windows}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-secondary">
               <CardHeader>
                  <CardTitle className="text-2xl">{t.ServicePages.form_title_windows}</CardTitle>
               </CardHeader>
               <CardContent>
                  <ContactForm defaultService={pageData.service_name} />
               </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
