"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/contexts/auth-context"
import { getStatusLabel, getStatusColor } from "@/lib/orders"
import { api } from "@/lib/api-client"
import Link from "next/link"

export default function ClientOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      if (user == null || typeof user.id !== "number") return
      try {
        const response = await api.getUserOrders(user.id)
        if (response.success) {
          setOrders(response.orders)
        }
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [user])

  if (loading) {
    return (
      <DashboardLayout title="Мои заказы" requiredRole="user">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Загрузка заказов...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Мои заказы" requiredRole="user">
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">У вас пока нет заказов</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link 
              key={order.id} 
              href={`/client/orders/${order.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Заказ #{order.id}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Город доставки: {order.delivery_city}</p>
                  {order.truck_identifier && (
                    <p className="text-sm text-gray-600">Фура: {order.truck_identifier}</p>
                  )}
                  {order.truck_arrival_date && (
                    <p className="text-sm text-gray-600">
                      Дата фуры: {new Date(order.truck_arrival_date).toLocaleDateString("ru-RU")}
                    </p>
                  )}
                  {order.delivery_date && (
                    <p className="text-sm font-medium text-[#568a56]">
                      Дата доставки: {new Date(order.delivery_date).toLocaleDateString("ru-RU")}
                    </p>
                  )}
                  {order.notes && <p className="text-sm text-blue-600 mt-1">Примечание: {order.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#568a56]">{Number(order.total_amount || 0).toLocaleString()} ₸</p>
                  <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString("ru-RU")}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Товары:</p>
                <div className="space-y-1">
                  {order.items && Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.product_name} × {item.quantity} шт.
                      </span>
                      <span className="text-gray-900">{(Number(item.quantity) * Number(item.unit_price)).toLocaleString()} ₸</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <span className="text-[#568a56] text-sm font-medium flex items-center gap-1">
                  Посмотреть детали
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
