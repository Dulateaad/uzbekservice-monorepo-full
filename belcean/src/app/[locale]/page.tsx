import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ReviewsCarousel } from '@/components/site/ReviewsCarousel';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Camera,
  Handshake,
  MessageCircle,
  Wrench,
  BadgeCheck,
  Users,
} from 'lucide-react';
import * as constants from '@/lib/constants';
import { getDictionary } from '@/lib/get-dictionary';
import type { Locale } from '@/i18n-config';
import { AutoCarousel } from '@/components/site/AutoCarousel';
import {
  RollingStatsSection,
  type RollingStatItem,
  type StatSuffix,
} from '@/components/site/RollingStatsSection';
import { HomeHeroFairPrice } from '@/components/site/HomeHeroFairPrice';
import { ServicesCalculateCta } from '@/components/site/ServicesCalculateCta';
import karcherLogo from '@/assets/brands/karcher-logo.png';
import tashkentCardHero from '@/assets/services/tashkent-card.jpg';

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const t = await getDictionary(locale);
  const services = constants.getServices(t);
  const clientTypes = constants.getClientTypes(t);
  const beforeAfterImages = constants.getBeforeAfterImages();
  const testimonials = constants.getTestimonials(t);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div id="hero">
        <HomeHeroFairPrice />
      </div>

      <RollingStatsSection
        variant="rows"
        backgroundImageSrc="/stats-trust-bg.png"
        statsHeader={{
          badge: t.HomePage.stats_header_badge,
          line1: t.HomePage.stats_headline_1,
          line2Accent: t.HomePage.stats_headline_2,
        }}
        ariaLabel={t.HomePage.stats_aria}
        items={(t.HomePage.stats_items as { value: number; label: string; label_line2?: string; suffix: string; isRating?: boolean }[]).map(
          (item, i): RollingStatItem => ({
            value: item.value,
            label: item.label,
            label_line2: item.label_line2,
            delayBase: i * 250,
            suffix: (item.suffix === 'star' || item.suffix === 'none' || item.suffix === 'plus'
              ? item.suffix
              : 'plus') as StatSuffix,
            isRating: Boolean(item.isRating),
          })
        )}
      />

      <section id="clients" className="w-full py-16 md:py-32">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="flex flex-col items-center justify-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline flex items-center justify-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-primary" /> {t.HomePage.clients_title}
            </h2>
            <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl/relaxed">
              {t.HomePage.clients_subtitle}
            </p>
          </div>
          <div className="mx-auto grid grid-cols-2 items-start gap-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-12 text-center">
            {clientTypes.map((client: any, index: number) => (
              <div key={index} className="flex flex-col items-center gap-4 text-center transition-transform duration-300 hover:scale-105">
                <div className="relative h-24 w-24 rounded-2xl bg-white shadow-sm overflow-hidden p-2">
                    <Image
                      src={client.imageUrl}
                      alt={client.name}
                      fill
                      className="object-contain p-2"
                    />
                </div>
                <p className="text-lg font-semibold">{client.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="w-full py-16 md:py-32 bg-secondary">
        <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center">
          <div className="mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline inline-flex items-center gap-3 relative after:content-[''] after:absolute after:-bottom-4 after:left-1/4 after:right-1/4 after:h-1 after:bg-primary after:rounded-full">
              <Sparkles className="w-8 h-8 text-primary" /> {t.HomePage.services_title}
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 w-full">
            {services.map((service: any, index: number) => {
              const ServiceIcon = service.icon;
              const officeVisual =
                service.imageId === 'service-office' ? tashkentCardHero : null;
              return (
                <Card key={index} className="flex flex-col overflow-hidden bg-background border border-transparent hover:border-primary transition-colors duration-300 h-full group">
                   <CardContent className="p-8 flex-grow flex flex-col items-center">
                    {officeVisual ? (
                      <div className="relative mb-6 flex h-40 w-full max-w-[260px] items-center justify-center overflow-hidden rounded-xl bg-primary/5 p-3">
                        <Image
                          src={officeVisual}
                          alt={service.title}
                          width={225}
                          height={225}
                          className="h-full w-full max-h-[152px] max-w-[152px] object-contain object-center"
                          sizes="152px"
                          priority={index === 0}
                        />
                      </div>
                    ) : (
                      <div className="mb-6 rounded-xl bg-primary/10 p-4 text-primary">
                        <ServiceIcon className="h-10 w-10" />
                      </div>
                    )}
                    <CardTitle className="text-xl mt-4">{service.title}</CardTitle>
                    <p className="text-muted-foreground mt-2 mb-4 flex-grow">{service.description}</p>
                     <Button asChild variant="link" className="p-0 h-auto font-semibold mt-auto opacity-70 group-hover:opacity-100 transition-opacity">
                      <Link href={`/${locale}/calculator`}>
                        {t.HomePage.learn_more} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <ServicesCalculateCta />
        </div>
      </section>

      <section id="trust-us" className="w-full py-16 md:py-32 bg-background">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="flex flex-col items-center justify-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline flex items-center justify-center gap-3">
              <Handshake className="w-8 h-8 text-primary" /> {t.HomePage.trust_us_title}
            </h2>
            <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl/relaxed">
              {t.HomePage.trust_us_subtitle}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            {(t.HomePage.trust_us_items as string[]).map((item: string, index: number) => (
              <div
                key={index}
                className="px-6 py-3 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trust-pillars" className="w-full py-16 md:py-32 bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
              {t.HomePage.trust_pillars_title}
            </h2>
            <p className="mt-3 text-muted-foreground md:text-lg">
              {t.HomePage.trust_pillars_subtitle}
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {(t.HomePage.trust_pillars as { title: string; description: string }[]).map((item, index) => {
              const icons = [Wrench, BadgeCheck, Users];
              const Icon = icons[index] ?? Wrench;
              return (
                <Card key={item.title} className="border bg-background/95 shadow-sm hover:border-primary/40 transition-colors">
                  <CardContent className="p-6 md:p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start md:flex-col">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="mb-2 font-semibold text-lg leading-snug">{item.title}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="partners" className="w-full py-16 md:py-32">
        <div className="container mx-auto px-4 md:px-6 text-center">
           <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline mb-12 flex items-center justify-center gap-3">
              <Handshake className="w-8 h-8 text-primary" /> {t.HomePage.partners_title}
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-16 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex flex-col items-center gap-2">
                    <div className="relative h-20 w-48">
                        <Image
                            src={karcherLogo}
                            alt="Kärcher"
                            fill
                            className="object-contain grayscale hover:grayscale-0 transition-all"
                        />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">Kärcher</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="relative h-16 w-32 md:h-20 md:w-40">
                        <Image
                            src="https://firebasestorage.googleapis.com/v0/b/studio-459358167-4d676.firebasestorage.app/o/Business%20Hub%20(1).png?alt=media&token=3f9f389e-0134-4258-8069-30db60758766"
                            alt="ODO"
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 128px, 160px"
                        />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">ODO</span>
                </div>
            </div>
        </div>
      </section>

      <section id="reviews" className="w-full py-16 md:py-32 bg-secondary/30">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="flex flex-col items-center justify-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline flex items-center justify-center gap-3">
              <MessageCircle className="w-8 h-8 text-primary" /> {t.HomePage.reviews_title}
            </h2>
            <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl/relaxed">
              {t.HomePage.reviews_subtitle}
            </p>
          </div>
          <div className="relative max-w-4xl mx-auto">
            <ReviewsCarousel
              testimonials={testimonials}
              clientLabel={t.HomePage.reviews_client_label}
            />
          </div>
        </div>
      </section>

      <section id="gallery" className="w-full py-16 md:py-32 text-center overflow-x-clip bg-secondary">
        <div className="max-w-[1792px] mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline mb-12 flex items-center justify-center gap-3">
            <Camera className="w-8 h-8 text-primary" /> {t.HomePage.gallery_title}
          </h2>
          <AutoCarousel className="w-full mx-auto">
            <CarouselContent>
              {beforeAfterImages.map((imageUrl: string, index: number) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-2 h-full">
                    <Card className="h-full overflow-hidden bg-white/50 backdrop-blur-sm">
                       <div className="relative aspect-video w-full">
                        <Image
                            src={imageUrl}
                            alt={`Work result ${index + 1}`}
                            fill
                            className="object-contain p-2"
                        />
                       </div>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 md:-left-12" />
            <CarouselNext className="-right-4 md:-right-12" />
          </AutoCarousel>
        </div>
      </section>
    </div>
  );
}
