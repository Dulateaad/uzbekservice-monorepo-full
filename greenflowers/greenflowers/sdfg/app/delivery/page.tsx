"use client"

import { Header } from "@/components/header"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { useLanguage } from "@/hooks/use-language"
import { getTranslation } from "@/lib/i18n"
import Link from "next/link"

export default function DeliveryPage() {
  const { language, isClient } = useLanguage()

  if (!isClient) return null

  return (
    <div>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8">{getTranslation(language, "deliveryTitle")}</h1>

        <div className="space-y-8">
          <section className="bg-card border border-border rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Cold Chain Process</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                    {step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {step === 1 && "Plantation Harvest"}
                      {step === 2 && "Quick Processing"}
                      {step === 3 && "Cold Transport"}
                      {step === 4 && "Final Delivery"}
                    </h3>
                    <p className="text-muted-foreground">
                      {step === 1 && "Fresh flowers harvested from our partner plantations in China"}
                      {step === 2 && "Sorting and packing within hours of harvest"}
                      {step === 3 && "Temperature-controlled shipping via air freight"}
                      {step === 4 && "Delivered to your location with cold chain maintained"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-secondary rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Delivery Coverage</h2>
            <p className="text-muted-foreground mb-6">
              We deliver to major cities across Kazakhstan and neighboring countries. Select your city during checkout
              to see available delivery options and dates.
            </p>
            <Link
              href="/catalog"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-accent transition-colors"
            >
              {getTranslation(language, "viewCatalog")}
            </Link>
          </section>

          <section className="bg-card border border-border rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Storage Guidelines</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Temperature</h3>
                <p className="text-muted-foreground">Keep flowers at 2-5°C (35-41°F) for maximum freshness</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Humidity</h3>
                <p className="text-muted-foreground">Optimal humidity levels are 85-95%</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Arrangement</h3>
                <p className="text-muted-foreground">Keep away from ripening fruits and direct sunlight</p>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Have Questions?</h2>
            <p className="text-muted-foreground mb-6">
              Contact our logistics team via WhatsApp for delivery inquiries and custom arrangements.
            </p>
            <WhatsAppButton variant="primary" />
          </section>
        </div>
      </div>
      <WhatsAppButton variant="floating" />
    </div>
  )
}
