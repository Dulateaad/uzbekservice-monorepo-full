"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { useRouter } from "next/navigation"
import { mockProducts } from "@/lib/mock-data"

export default function PreordersPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<"regular" | "holiday">("regular")
  const router = useRouter()

  const holidays = [
    { value: "valentines_day", label: "Valentine's Day (Feb 14)", date: "2025-02-14" },
    { value: "women_day", label: "Women's Day (Mar 8)", date: "2025-03-08" },
    { value: "nauryz", label: "Nauryz (Mar 21)", date: "2025-03-21" },
    { value: "new_year", label: "New Year (Jan 1)", date: "2026-01-01" },
  ]

  useEffect(() => {
    setProducts(mockProducts)
    setLoading(false)
  }, [])

  const handlePreorder = (productId: string, holidayType?: string) => {
    const params = new URLSearchParams({
      productId,
      type: selectedType,
      ...(holidayType && { holiday: holidayType }),
    })

    router.push(`/preorders/checkout?${params}`)
  }

  if (loading)
    return (
      <div>
        <Header />
        Loading...
      </div>
    )

  return (
    <div>
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8">Pre-orders</h1>

        <div className="mb-8">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setSelectedType("regular")}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedType === "regular"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              Regular Pre-orders
            </button>
            <button
              onClick={() => setSelectedType("holiday")}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedType === "holiday"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              Holiday Pre-orders
            </button>
          </div>

          {selectedType === "regular" ? (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Regular Pre-orders</h2>
              <p className="text-muted-foreground mb-6">
                Pre-order flowers that are currently in transit from our plantations. Select your desired delivery date.
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-secondary border border-border rounded-lg p-6">
                    <h3 className="font-semibold text-foreground mb-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">${product.price_per_unit}/unit</p>
                    <button
                      onClick={() => handlePreorder(product.id)}
                      className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:bg-accent transition-colors"
                    >
                      Pre-order Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {holidays.map((holiday) => (
                <div key={holiday.value} className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-2xl font-semibold text-foreground mb-2">{holiday.label}</h2>
                  <p className="text-muted-foreground mb-6">
                    Limited quantity pre-orders for {holiday.label}. Order early to secure your flowers!
                  </p>
                  <div className="grid md:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <div key={product.id} className="bg-secondary border border-border rounded-lg p-6">
                        <h3 className="font-semibold text-foreground mb-2">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">${product.price_per_unit}/unit</p>
                        <button
                          onClick={() => handlePreorder(product.id, holiday.value)}
                          className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:bg-accent transition-colors"
                        >
                          Pre-order
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
