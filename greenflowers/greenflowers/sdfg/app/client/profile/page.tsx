"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { kazakhstanCities } from "@/lib/auth"
import { api } from "@/lib/api-client"

export default function ClientProfilePage() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    totalSpent: 0,
    totalPreorders: 0
  })
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    city: ""
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        company_name: user.company_name || "",
        city: user.city || ""
      })
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    if (!user?.id) return
    
    try {
      const response = await api.getProfileStats(user.id)
      if (response.success) {
        setStats(response.stats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id) return
    
    setSaving(true)
    try {
      const response = await api.updateProfile(user.id, {
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        company_name: formData.company_name
      })
      
      if (response.success) {
        updateUser(response.user)
        setEditing(false)
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Ошибка при обновлении профиля")
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Мой профиль" requiredRole="user">
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-[#568a56] rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                Клиент
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Имя *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!editing}
                  required
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!editing}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Телефон</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editing}
                  placeholder="+7 777 123 4567"
                />
              </div>
              <div>
                <Label>Город</Label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={!editing}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50"
                >
                  <option value="">Выберите город</option>
                  {kazakhstanCities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name.ru}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Название компании (опционально)</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                disabled={!editing}
                placeholder="ТОО Цветочный рай"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            {!editing ? (
              <Button
                onClick={() => setEditing(true)}
                className="bg-[#568a56] hover:bg-[#457245]"
              >
                Редактировать профиль
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#568a56] hover:bg-[#457245]"
                >
                  {saving ? "Сохранение..." : "Сохранить изменения"}
                </Button>
                <Button
                  onClick={() => {
                    setEditing(false)
                    if (user) {
                      setFormData({
                        name: user.name || "",
                        email: user.email || "",
                        phone: user.phone || "",
                        company_name: user.company_name || "",
                        city: user.city || ""
                      })
                    }
                  }}
                  variant="outline"
                >
                  Отмена
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Статистика */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Статистика</h3>
          {loadingStats ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-[#568a56] border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-[#568a56]">{stats.totalOrders}</p>
                <p className="text-sm text-gray-600">Всего заказов</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{stats.activeOrders}</p>
                <p className="text-sm text-gray-600">Активных</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.totalPreorders}</p>
                <p className="text-sm text-gray-600">Предзаказов</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{stats.totalSpent.toLocaleString()} ₸</p>
                <p className="text-sm text-gray-600">Потрачено</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
