"use client"

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { Header } from "@/components/header"
import { useRouter, useSearchParams } from "next/navigation"
import { mockProducts } from "@/lib/mock-data"

function PreorderCheckoutContent() {
  const [product, setProduct] = useState<any>(null)
  const [quantity, setQuantity] = useState(10)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const productId = searchParams.get("productId")
  const type = searchParams.get("type")
  const holiday = searchParams.get("holiday")

  useEffect(() => {
    if (productId) {
      const foundProduct = mockProducts.find((p) => p.id === productId)
      setProduct(foundProduct || null)
    }
  }, [productId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Mock preorder creation
    setTimeout(() => {
      router.push(`/account?preorder_success=true`)
    }, 1000)
  }

  if (!product)
    return (
      <div>
        <Header />
        Loading...
      </div>
    )

  return (
    <div>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8">Pre-order Checkout</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Order Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="font-semibold text-foreground text-lg">{product.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Price per unit</p>
                  <p className="font-bold text-primary text-xl">${product.price_per_unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(product.min_order_quantity || 10, Number.parseInt(e.target.value)))
                    }
                    className="w-full px-4 py-2 border border-border rounded-lg"
                    min={product.min_order_quantity || 10}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-secondary border border-border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-foreground font-semibold">Total</span>
              <span className="text-3xl font-bold text-primary">${(product.price_per_unit * quantity).toFixed(2)}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {type === "holiday" && holiday
                ? "Limited quantity holiday pre-order"
                : "Regular pre-order - delivery date to be confirmed"}
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-accent transition-colors disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Confirm Pre-order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PreorderCheckout() {
  return (
    <Suspense
      fallback={
        <div>
          <Header />
          Loading...
        </div>
      }
    >
      <PreorderCheckoutContent />
    </Suspense>
  )
}
