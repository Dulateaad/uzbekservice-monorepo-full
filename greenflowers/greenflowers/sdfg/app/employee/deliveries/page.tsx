"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { mockDeliveryZones, mockDeliverySchedules } from "@/lib/mock-data"

export default function DeliveriesPage() {
  const [zones, setZones] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [zoneData, setZoneData] = useState({ city_name: "", delivery_fee: "", delivery_days: "" })
  const [scheduleData, setScheduleData] = useState({
    shipment_date: "",
    expected_arrival_date: "",
    quantity_available: "",
  })

  useEffect(() => {
    setZones(mockDeliveryZones)
    setSchedules(mockDeliverySchedules)
    setLoading(false)
  }, [])

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault()

    const newZone = {
      id: `zone-${Date.now()}`,
      city_name: zoneData.city_name,
      delivery_fee: Number.parseFloat(zoneData.delivery_fee),
      delivery_days: Number.parseInt(zoneData.delivery_days),
      is_active: true,
    }

    setZones([...zones, newZone])
    setZoneData({ city_name: "", delivery_fee: "", delivery_days: "" })
    setShowZoneForm(false)
  }

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()

    const newSchedule = {
      id: `sched-${Date.now()}`,
      shipment_date: scheduleData.shipment_date,
      expected_arrival_date: scheduleData.expected_arrival_date,
      quantity_available: Number.parseInt(scheduleData.quantity_available),
      status: "planned",
    }

    setSchedules([newSchedule, ...schedules])
    setScheduleData({ shipment_date: "", expected_arrival_date: "", quantity_available: "" })
    setShowScheduleForm(false)
  }

  const handleUpdateScheduleStatus = (scheduleId: string, newStatus: string) => {
    setSchedules(schedules.map((s) => (s.id === scheduleId ? { ...s, status: newStatus } : s)))
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/employee/dashboard" className="text-primary hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Delivery Management</h1>
          <div></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Delivery Zones */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Delivery Zones</h2>
              <button
                onClick={() => setShowZoneForm(!showZoneForm)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent transition-colors"
              >
                + Add Zone
              </button>
            </div>

            {showZoneForm && (
              <form onSubmit={handleAddZone} className="bg-card border border-border rounded-lg p-6 mb-6">
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="City Name"
                    value={zoneData.city_name}
                    onChange={(e) => setZoneData({ ...zoneData, city_name: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Delivery Fee ($)"
                    value={zoneData.delivery_fee}
                    onChange={(e) => setZoneData({ ...zoneData, delivery_fee: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                    step="0.01"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Delivery Days"
                    value={zoneData.delivery_days}
                    onChange={(e) => setZoneData({ ...zoneData, delivery_days: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                    required
                  />
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:bg-accent transition-colors"
                    >
                      Add Zone
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowZoneForm(false)}
                      className="flex-1 border-2 border-border text-foreground py-2 rounded-lg font-semibold hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {zones.map((zone) => (
                <div key={zone.id} className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground">{zone.city_name}</h3>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Fee</p>
                      <p className="font-medium">${zone.delivery_fee}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Days</p>
                      <p className="font-medium">{zone.delivery_days}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Delivery Schedules */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Shipment Schedule</h2>
              <button
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent transition-colors"
              >
                + Add Schedule
              </button>
            </div>

            {showScheduleForm && (
              <form onSubmit={handleAddSchedule} className="bg-card border border-border rounded-lg p-6 mb-6">
                <div className="space-y-4">
                  <input
                    type="date"
                    placeholder="Shipment Date"
                    value={scheduleData.shipment_date}
                    onChange={(e) => setScheduleData({ ...scheduleData, shipment_date: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                    required
                  />
                  <input
                    type="date"
                    placeholder="Expected Arrival"
                    value={scheduleData.expected_arrival_date}
                    onChange={(e) => setScheduleData({ ...scheduleData, expected_arrival_date: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Quantity Available"
                    value={scheduleData.quantity_available}
                    onChange={(e) => setScheduleData({ ...scheduleData, quantity_available: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                    required
                  />
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:bg-accent transition-colors"
                    >
                      Add Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowScheduleForm(false)}
                      className="flex-1 border-2 border-border text-foreground py-2 rounded-lg font-semibold hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Ship: {new Date(schedule.shipment_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Arrive: {new Date(schedule.expected_arrival_date).toLocaleDateString()}
                      </p>
                    </div>
                    <select
                      value={schedule.status}
                      onChange={(e) => handleUpdateScheduleStatus(schedule.id, e.target.value)}
                      className="px-3 py-1 border border-border rounded text-sm"
                    >
                      <option value="planned">Planned</option>
                      <option value="shipped">Shipped</option>
                      <option value="arrived">Arrived</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <p className="font-semibold text-foreground">{schedule.quantity_available} units</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
