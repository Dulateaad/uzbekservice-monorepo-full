"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { staffBasePathFromPathname } from "@/lib/staff-base-path";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  Settings,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Calendar as CalendarIcon,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

interface CalendarEvent {
  id: number;
  event_type: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "critical";
  is_auto_generated: boolean;
  is_read: boolean;
}

interface DayEvents {
  [date: string]: CalendarEvent[];
}

interface Threshold {
  id: number;
  threshold_type: string;
  threshold_value: number;
  description: string;
  is_active: boolean;
}

interface Summary {
  shifts: {
    total_shifts: number;
    total_sales: number;
    total_discounts: number;
    total_orders: number;
  };
  inventory: {
    total_batches: number;
    total_items: number;
    total_cost: number;
  };
  unreadImportantEvents: number;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const staffBase = staffBasePathFromPathname(pathname);

  // Утилиты для работы с датами
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseLocalDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const [loading, setLoading] = useState(true);

  // Календарь
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<DayEvents>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);

  // Сводка
  const [summary, setSummary] = useState<Summary | null>(null);

  // Настройки
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  // Форма создания события
  const [newEvent, setNewEvent] = useState({
    eventDate: formatLocal(new Date()),
    title: "",
    description: "",
    eventType: "custom",
    priority: "medium",
  });

  useEffect(() => {
    if (!user || !["admin", "worker"].includes(user.role)) {
      router.push("/auth/login");
      return;
    }
    loadData();
  }, [user, currentDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const [eventsData, summaryData] = await Promise.all([
        api.getCalendarMonthEvents(year, month),
        api.getAnalyticsSummary({}),
      ]);

      if (eventsData.success) {
        setEvents(eventsData.events);
      }
      if (summaryData.success) {
        setSummary(summaryData);
      }
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadThresholds = async () => {
    try {
      const response = await api.getAnalyticsThresholds();
      if (response.success) {
        setThresholds(response.thresholds);
      }
    } catch (error) {
      console.error("Error loading thresholds:", error);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setSelectedEvents(events[date] || []);
  };

  const handleCreateEvent = async () => {
    try {
      const response = await api.createCalendarEvent({
        userId: user!.id,
        eventDate: newEvent.eventDate,
        title: newEvent.title,
        description: newEvent.description,
        eventType: newEvent.eventType,
        priority: newEvent.priority,
      });

      if (response.success) {
        setIsCreateEventOpen(false);
        setNewEvent({
          eventDate: formatLocal(new Date()),
          title: "",
          description: "",
          eventType: "custom",
          priority: "medium",
        });
        loadData();
      }
    } catch (error) {
      console.error("Error creating event:", error);
    }
  };

  const handleMarkAsRead = async (eventId: number) => {
    try {
      await api.markEventAsRead(eventId);
      loadData();
      if (selectedDate) {
        const updatedEvents = selectedEvents.map((e) =>
          e.id === eventId ? { ...e, is_read: true } : e,
        );
        setSelectedEvents(updatedEvents);
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleGenerateEvents = async () => {
    try {
      const response = await api.generateCalendarEvents(user!.id);
      if (response.success) {
        alert(`Создано ${response.eventsCreated} событий`);
        loadData();
      }
    } catch (error) {
      console.error("Error generating events:", error);
    }
  };

  const handleUpdateThreshold = async (type: string, value: number) => {
    try {
      await api.updateAnalyticsThreshold(type, { userId: user!.id, value });
      loadThresholds();
    } catch (error) {
      console.error("Error updating threshold:", error);
    }
  };

  // Генерация дней месяца
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay() || 7; // Понедельник = 1

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Дни предыдущего месяца
    for (let i = startDayOfWeek - 1; i > 0; i--) {
      const date = new Date(year, month, 1 - i);
      days.push({
        date: formatLocal(date),
        day: date.getDate(),
        isCurrentMonth: false,
      });
    }

    // Дни текущего месяца
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date: formatLocal(date),
        day: i,
        isCurrentMonth: true,
      });
    }

    // Дни следующего месяца
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date: formatLocal(date),
        day: i,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "high_sales":
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case "low_sales":
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      case "large_discount":
        return <AlertTriangle className="h-3 w-3 text-orange-600" />;
      case "inventory_received":
        return <Package className="h-3 w-3 text-blue-600" />;
      case "price_change":
        return <TrendingUp className="h-3 w-3 text-purple-600" />;
      case "stock_alert":
        return <AlertTriangle className="h-3 w-3 text-red-600" />;
      default:
        return <CalendarIcon className="h-3 w-3 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      critical: "bg-red-100 text-red-800",
      high: "bg-orange-100 text-orange-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-gray-100 text-gray-800",
    };
    const labels = {
      critical: "Критично",
      high: "Высокий",
      medium: "Средний",
      low: "Низкий",
    };
    return (
      <Badge className={colors[priority as keyof typeof colors]}>
        {labels[priority as keyof typeof labels]}
      </Badge>
    );
  };

  const monthNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];

  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const today = formatLocal(new Date());

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#568a56] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={staffBase} className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Календарь аналитики
                </h1>
                <p className="text-gray-600">Важные события и уведомления</p>
              </div>
            </div>
            <div className="flex gap-2">
              {summary && summary.unreadImportantEvents > 0 && (
                <Badge className="bg-red-500 text-white">
                  <Bell className="h-3 w-3 mr-1" />
                  {summary.unreadImportantEvents} непрочитанных
                </Badge>
              )}
              <Button variant="outline" onClick={handleGenerateEvents}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить события
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  loadThresholds();
                  setIsSettingsOpen(true);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Настройки
              </Button>
              <Dialog
                open={isCreateEventOpen}
                onOpenChange={setIsCreateEventOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-[#568a56] hover:bg-[#467046]">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить событие
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Новое событие</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Дата</label>
                      <Input
                        type="date"
                        value={newEvent.eventDate}
                        onChange={(e) =>
                          setNewEvent((prev) => ({
                            ...prev,
                            eventDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Заголовок</label>
                      <Input
                        placeholder="Название события"
                        value={newEvent.title}
                        onChange={(e) =>
                          setNewEvent((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Описание</label>
                      <Input
                        placeholder="Подробности"
                        value={newEvent.description}
                        onChange={(e) =>
                          setNewEvent((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Приоритет</label>
                      <select
                        className="w-full border rounded p-2"
                        value={newEvent.priority}
                        onChange={(e) =>
                          setNewEvent((prev) => ({
                            ...prev,
                            priority: e.target.value,
                          }))
                        }
                      >
                        <option value="low">Низкий</option>
                        <option value="medium">Средний</option>
                        <option value="high">Высокий</option>
                        <option value="critical">Критичный</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateEventOpen(false)}
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleCreateEvent}
                      className="bg-[#568a56] hover:bg-[#467046]"
                    >
                      Создать
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Сводка */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {Number(summary.shifts.total_sales || 0).toLocaleString()} тг
                </div>
                <div className="text-sm text-gray-600">Продажи за период</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {summary.shifts.total_shifts || 0}
                </div>
                <div className="text-sm text-gray-600">Закрытых смен</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {summary.inventory.total_batches || 0}
                </div>
                <div className="text-sm text-gray-600">Партий товара</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {summary.shifts.total_orders || 0}
                </div>
                <div className="text-sm text-gray-600">Заказов</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Календарь */}
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <CardTitle>
                    {monthNames[currentDate.getMonth()]}{" "}
                    {currentDate.getFullYear()}
                  </CardTitle>
                  <Button variant="ghost" onClick={handleNextMonth}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Дни недели */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-gray-600 py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Дни месяца */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth().map((day, index) => {
                    const dayEvents = events[day.date] || [];
                    const hasEvents = dayEvents.length > 0;
                    const hasUnread = dayEvents.some((e) => !e.is_read);
                    const highPriority = dayEvents.some((e) =>
                      ["high", "critical"].includes(e.priority),
                    );

                    return (
                      <div
                        key={index}
                        onClick={() =>
                          day.isCurrentMonth && handleDayClick(day.date)
                        }
                        className={`
                          min-h-20 p-1 border rounded cursor-pointer transition-colors
                          ${
                            day.isCurrentMonth
                              ? "bg-white hover:bg-gray-50"
                              : "bg-gray-50 text-gray-400"
                          }
                          ${
                            day.date === today
                              ? "border-[#568a56] border-2"
                              : "border-gray-200"
                          }
                          ${
                            selectedDate === day.date
                              ? "ring-2 ring-[#568a56]"
                              : ""
                          }
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <span
                            className={`text-sm font-medium ${
                              day.date === today ? "text-[#568a56]" : ""
                            }`}
                          >
                            {day.day}
                          </span>
                          {hasUnread && (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                highPriority ? "bg-red-500" : "bg-orange-500"
                              }`}
                            ></span>
                          )}
                        </div>
                        {hasEvents && day.isCurrentMonth && (
                          <div className="mt-1 space-y-0.5">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div
                                key={i}
                                className={`flex items-center gap-1 text-xs truncate ${
                                  event.is_read ? "opacity-60" : ""
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(
                                    event.priority,
                                  )}`}
                                ></span>
                                {getEventIcon(event.event_type)}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{dayEvents.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Панель событий */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>
                  {selectedDate
                    ? `События: ${parseLocalDate(
                        selectedDate,
                      ).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                      })}`
                    : "Выберите день"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEvents.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg border ${
                          event.is_read
                            ? "bg-gray-50"
                            : "bg-white border-l-4 border-l-" +
                              getPriorityColor(event.priority).replace(
                                "bg-",
                                "",
                              )
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getEventIcon(event.event_type)}
                            <span className="font-medium text-sm">
                              {event.title}
                            </span>
                          </div>
                          {!event.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(event.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(event.priority)}
                          {event.is_auto_generated && (
                            <Badge variant="outline" className="text-xs">
                              Авто
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedDate ? (
                  <p className="text-gray-500 text-center py-8">
                    Нет событий в этот день
                  </p>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Кликните на день для просмотра событий
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Легенда */}
            <Card className="mt-4">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Типы событий</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>Высокие продажи</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span>Низкие продажи</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span>Большие скидки / Низкий остаток</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span>Поставка товара</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Диалог настроек */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Настройки пороговых значений</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Система автоматически создаст события в календаре при достижении
              этих значений
            </p>
            {thresholds.map((threshold) => (
              <div
                key={threshold.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div>
                  <div className="font-medium text-sm">
                    {threshold.description}
                  </div>
                  <div className="text-xs text-gray-500">
                    {threshold.threshold_type}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-32"
                    value={threshold.threshold_value}
                    onChange={(e) =>
                      handleUpdateThreshold(
                        threshold.threshold_type,
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSettingsOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
