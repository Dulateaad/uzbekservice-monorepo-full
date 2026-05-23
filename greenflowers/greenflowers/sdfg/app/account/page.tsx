"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { useLanguage } from "@/hooks/use-language"
import { getTranslation } from "@/lib/i18n"
import Link from "next/link"

interface Order {
  id: string
  city: string
  totalAmount: number
  status: "pending" | "processing" | "shipped" | "delivered"
  createdAt: string
}

export default function AccountPage() {
  const { language, isClient } = useLanguage()
  const [profile, setProfile] = useState({
    company_name: "",
    contact_person: "",
    phone: "",
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [editMode, setEditMode] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const savedProfile = localStorage.getItem("userProfile")
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile))
    }

    const savedOrders = localStorage.getItem("userOrders")
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders))
    }
  }, [])

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem("userProfile", JSON.stringify(profile))
    setEditMode(false)
  }

  if (!isClient || !isMounted) return null

  return (
    <div>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8">{getTranslation(language, "myAccount")}</h1>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Profile</h2>

              {editMode ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <input
                    type="text"
                    value={profile.company_name}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                    placeholder="Company Name"
                  />
                  <input
                    type="text"
                    value={profile.contact_person}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        contact_person: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                    placeholder="Contact Person"
                  />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                    placeholder="Phone"
                  />
                  <button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="w-full border-2 border-border text-foreground py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Company</p>
                      <p className="font-medium text-foreground">{profile.company_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="font-medium text-foreground">{profile.contact_person || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium text-foreground">{profile.phone || "-"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    className="w-full border-2 border-primary text-primary py-2 rounded-lg text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Orders Section */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Order History</h2>
            {orders.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground mb-4">No orders yet</p>
                <Link href="/catalog" className="text-primary hover:underline font-semibold">
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="font-semibold text-foreground mt-1">{order.city}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">${order.totalAmount.toFixed(2)}</p>
                        <p
                          className={`text-xs font-medium mt-2 px-2 py-1 rounded ${
                            order.status === "delivered"
                              ? "bg-green-100 text-green-800"
                              : order.status === "shipped"
                                ? "bg-blue-100 text-blue-800"
                                : order.status === "processing"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <WhatsAppButton variant="floating" />
    </div>
  )
}
