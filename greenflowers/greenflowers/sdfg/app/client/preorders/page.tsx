"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/contexts/auth-context"
import { getStatusLabel, getStatusColor } from "@/lib/orders"
import { api } from "@/lib/api-client"

export default function ClientPreordersPage() {
  const { user } = useAuth()
  const [preorders, setPreorders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPreorders = async () => {
      if (!user?.id) return
      try {
        const response = await api.getUserPreorders(user.id)
        if (response.success) {
          setPreorders(response.preorders)
        }
      } catch (error) {
        console.error('Error fetching preorders:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPreorders()
  }, [user])

  if (loading) {
    return (
      <DashboardLayout title="Мои предзаказы" requiredRole="user">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Загрузка предзаказов...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Мои предзаказы" requiredRole="user">
      {preorders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">У вас пока нет предзаказов</p>
        </div>
      ) : (
        <div className="space-y-4">
          {preorders.map((preorder) => (
            <div key={preorder.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Предзаказ #{preorder.id}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(preorder.status)}`}>
                      {getStatusLabel(preorder.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Товар: {preorder.product_name}</p>
                  <p className="text-sm text-gray-500">Количество: {preorder.quantity} шт.</p>
                  {preorder.desired_delivery_date && (
                    <p className="text-sm font-medium text-[#568a56]">
                      Желаемая дата доставки: {new Date(preorder.desired_delivery_date).toLocaleDateString("ru-RU")}
                    </p>
                  )}
                  {preorder.order_type && (
                    <p className="text-sm text-blue-600">
                      Тип: {preorder.order_type === 'holiday_preorder' ? 'Праздничный' : 'Обычный'}
                    </p>
                  )}
                  {preorder.holiday_type && (
                    <p className="text-sm text-purple-600">
                      Праздник: {preorder.holiday_type}
                    </p>
                  )}
                  {preorder.notes && <p className="text-sm text-gray-600 mt-1">Примечание: {preorder.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{new Date(preorder.created_at).toLocaleDateString("ru-RU")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
