import { kazakhstanCities } from "./auth";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_transit"
  | "delivered"
  | "cancelled";
export type PreorderStatus = "pending" | "confirmed" | "cancelled";

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  pricePerBox: number;
  total: number;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  cityId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  deliveryDate: string;
  createdAt: Date;
  notes?: string;
}

export interface Preorder {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  cityId: string;
  items: OrderItem[];
  total: number;
  status: PreorderStatus;
  holidayType?: string;
  deliveryDate: string;
  createdAt: Date;
  notes?: string;
}

// Holiday types for preorders
export const holidayTypes = [
  {
    id: "valentine",
    name: {
      ru: "14 Февраля (День Святого Валентина)",
      en: "Valentine's Day",
      kk: "14 Ақпан",
    },
  },
  {
    id: "march8",
    name: {
      ru: "8 Марта (Международный женский день)",
      en: "International Women's Day",
      kk: "8 Наурыз",
    },
  },
  {
    id: "nauryz",
    name: { ru: "Наурыз (21-23 марта)", en: "Nauryz", kk: "Наурыз" },
  },
  {
    id: "mothersday",
    name: { ru: "День Матери", en: "Mother's Day", kk: "Аналар күні" },
  },
  {
    id: "september1",
    name: {
      ru: "1 Сентября (День Знаний)",
      en: "Knowledge Day",
      kk: "1 Қыркүйек",
    },
  },
  {
    id: "teachersday",
    name: { ru: "День Учителя", en: "Teacher's Day", kk: "Мұғалімдер күні" },
  },
  { id: "newyear", name: { ru: "Новый Год", en: "New Year", kk: "Жаңа Жыл" } },
  {
    id: "other",
    name: { ru: "Другой праздник", en: "Other Holiday", kk: "Басқа мереке" },
  },
];

// Mock orders
export const mockOrders: Order[] = [
  {
    id: "ORD-001",
    clientId: "client-1",
    clientName: "Иван Петров",
    clientPhone: "+7 777 333 4444",
    cityId: "almaty",
    items: [
      {
        productId: 1,
        productName: "Розы красные Premium",
        quantity: 5,
        pricePerBox: 21250,
        total: 106250,
      },
      {
        productId: 8,
        productName: "Гипсофила Million Star",
        quantity: 2,
        pricePerBox: 15000,
        total: 30000,
      },
    ],
    total: 136250,
    status: "pending",
    deliveryDate: "2024-12-15",
    createdAt: new Date("2024-12-01"),
    notes: "Доставка до 10:00",
  },
  {
    id: "ORD-002",
    clientId: "client-2",
    clientName: "ТОО Цветочный Рай",
    clientPhone: "+7 777 555 6666",
    cityId: "astana",
    items: [
      {
        productId: 4,
        productName: "Хризантемы жёлтые Santini",
        quantity: 10,
        pricePerBox: 22500,
        total: 225000,
      },
    ],
    total: 225000,
    status: "processing",
    deliveryDate: "2024-12-12",
    createdAt: new Date("2024-12-02"),
  },
  {
    id: "ORD-003",
    clientId: "client-3",
    clientName: "Мария Иванова",
    clientPhone: "+7 777 777 8888",
    cityId: "shymkent",
    items: [
      {
        productId: 6,
        productName: "Гвоздики красные Premium",
        quantity: 3,
        pricePerBox: 15000,
        total: 45000,
      },
    ],
    total: 45000,
    status: "delivered",
    deliveryDate: "2024-11-28",
    createdAt: new Date("2024-11-25"),
  },
];

// Mock preorders
export const mockPreorders: Preorder[] = [
  {
    id: "PRE-001",
    clientId: "client-4",
    clientName: "ТОО Праздник",
    clientPhone: "+7 777 111 2222",
    cityId: "almaty",
    items: [
      {
        productId: 14,
        productName: "8 Марта микс",
        quantity: 50,
        pricePerBox: 75000,
        total: 3750000,
      },
      {
        productId: 12,
        productName: "Тюльпаны весенняя коллекция",
        quantity: 20,
        pricePerBox: 35000,
        total: 700000,
      },
    ],
    total: 4450000,
    status: "confirmed",
    holidayType: "march8",
    deliveryDate: "2025-03-01",
    createdAt: new Date("2024-11-15"),
    notes: "Крупный заказ на 8 Марта",
  },
  {
    id: "PRE-002",
    clientId: "client-5",
    clientName: "Цветы 24",
    clientPhone: "+7 777 999 0000",
    cityId: "astana",
    items: [
      {
        productId: 13,
        productName: "Валентинов микс красный",
        quantity: 30,
        pricePerBox: 90000,
        total: 2700000,
      },
    ],
    total: 2700000,
    status: "pending",
    holidayType: "valentine",
    deliveryDate: "2025-02-10",
    createdAt: new Date("2024-12-01"),
  },
];

export function getCityName(
  cityId: string,
  lang: "ru" | "en" | "kk" = "ru",
): string {
  const city = kazakhstanCities.find((c) => c.id === cityId);
  return city?.name[lang] || cityId;
}

export function getStatusLabel(
  status: OrderStatus | PreorderStatus,
  lang: "ru" | "en" | "kk" = "ru",
): string {
  const labels: Record<string, Record<string, string>> = {
    new: { ru: "Ожидание", en: "New", kk: "Жаңа" },
    pending: { ru: "Ожидание", en: "Pending", kk: "Күтуде" },
    processing: { ru: "Обработка", en: "Processing", kk: "Өңдеу" },
    confirmed: { ru: "Подтверждён", en: "Confirmed", kk: "Расталды" },
    in_transit: { ru: "В пути", en: "In Transit", kk: "Жолда" },
    delivered: { ru: "Доставлен", en: "Delivered", kk: "Жеткізілді" },
    cancelled: { ru: "Отменён", en: "Cancelled", kk: "Бас тартылды" },
  };
  return labels[status]?.[lang] || status;
}

export function getStatusColor(status: OrderStatus | PreorderStatus): string {
  switch (status) {
    case "new":
      return "bg-yellow-100 text-yellow-700";
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "confirmed":
      return "bg-blue-100 text-blue-700";
    case "in_transit":
      return "bg-indigo-100 text-indigo-700";
    case "delivered":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
