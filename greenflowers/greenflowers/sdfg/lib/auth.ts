// Auth types and mock data for authentication system
import { api } from "./api-client";

export type UserRole = "user" | "worker" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  city?: string;
  address?: string;
  createdAt: Date;
}

// Mock users for demo (in production would be in database)
export const mockUsers: User[] = [
  {
    id: "admin-1",
    email: "admin@sprayflowers.kz",
    name: "Администратор",
    phone: "+7 708 235 4533",
    role: "admin",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "employee-1",
    email: "worker@sprayflowers.kz",
    name: "Работник Склада",
    phone: "+7 777 111 2222",
    role: "employee",
    createdAt: new Date("2024-03-01"),
  },
  {
    id: "client-1",
    email: "client@test.kz",
    name: "Иван Петров",
    phone: "+7 777 333 4444",
    role: "user",
    city: "Алматы",
    createdAt: new Date("2024-06-01"),
  },
];

// Mock passwords (in production would be hashed)
export const mockPasswords: Record<string, string> = {
  "admin@sprayflowers.kz": "admin123",
  "worker@sprayflowers.kz": "worker123",
  "client@test.kz": "client123",
};

// Kazakhstan cities for delivery
export const kazakhstanCities = [
  { id: "almaty", name: { ru: "Алматы", en: "Almaty", kk: "Алматы" } },
  { id: "astana", name: { ru: "Астана", en: "Astana", kk: "Астана" } },
  { id: "shymkent", name: { ru: "Шымкент", en: "Shymkent", kk: "Шымкент" } },
  {
    id: "karaganda",
    name: { ru: "Караганда", en: "Karaganda", kk: "Қарағанды" },
  },
  { id: "aktobe", name: { ru: "Актобе", en: "Aktobe", kk: "Ақтөбе" } },
  { id: "taraz", name: { ru: "Тараз", en: "Taraz", kk: "Тараз" } },
  { id: "pavlodar", name: { ru: "Павлодар", en: "Pavlodar", kk: "Павлодар" } },
  {
    id: "ust-kamenogorsk",
    name: { ru: "Усть-Каменогорск", en: "Ust-Kamenogorsk", kk: "Өскемен" },
  },
  { id: "semey", name: { ru: "Семей", en: "Semey", kk: "Семей" } },
  { id: "atyrau", name: { ru: "Атырау", en: "Atyrau", kk: "Атырау" } },
  { id: "kostanay", name: { ru: "Костанай", en: "Kostanay", kk: "Қостанай" } },
  {
    id: "petropavlovsk",
    name: { ru: "Петропавловск", en: "Petropavlovsk", kk: "Петропавл" },
  },
  { id: "oral", name: { ru: "Уральск", en: "Oral", kk: "Орал" } },
  { id: "aktau", name: { ru: "Актау", en: "Aktau", kk: "Ақтау" } },
  {
    id: "kyzylorda",
    name: { ru: "Кызылорда", en: "Kyzylorda", kk: "Қызылорда" },
  },
  {
    id: "turkestan",
    name: { ru: "Туркестан", en: "Turkestan", kk: "Түркістан" },
  },
];

// Role permissions
export const rolePermissions = {
  client: {
    canViewCatalog: true,
    canCreateOrder: true,
    canViewOwnOrders: true,
    canCreatePreorder: true,
    canManageProducts: false,
    canManageOrders: false,
    canManageUsers: false,
    canViewAllOrders: false,
    canManageEmployees: false,
  },
  employee: {
    canViewCatalog: true,
    canCreateOrder: true,
    canViewOwnOrders: true,
    canCreatePreorder: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageUsers: false,
    canViewAllOrders: true,
    canManageEmployees: false,
  },
  admin: {
    canViewCatalog: true,
    canCreateOrder: true,
    canViewOwnOrders: true,
    canCreatePreorder: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageUsers: true,
    canViewAllOrders: true,
    canManageEmployees: true,
  },
};

export function hasPermission(
  role: UserRole,
  permission: keyof typeof rolePermissions.client,
): boolean {
  return rolePermissions[role]?.[permission] ?? false;
}
/**
 * Check if a user has a specific permission (can be overridden in database)
 * @param userId - User ID to check
 * @param permissionKey - Permission key (e.g., 'create_product')
 * @returns true if user has permission
 */
export async function checkUserPermission(
  userId: number,
  permissionKey: string,
): Promise<boolean> {
  try {
    if (
      typeof window !== "undefined" &&
      !(process.env.NEXT_PUBLIC_API_URL || "").trim()
    ) {
      return true;
    }
    const endpoint = `/permissions/user-permissions/${userId}?currentUserId=${userId}`;
    console.log("📋 Fetching permissions from:", endpoint);

    const response = await api.request(endpoint);

    if (!response.success) {
      console.error(`❌ Permission fetch failed:`, response.error || response);
      return true; // default to true on error for backward compatibility
    }

    console.log("✅ Permissions loaded:", response.permissions);

    return (
      response.permissions[
        permissionKey as keyof typeof response.permissions
      ] ?? true
    );
  } catch (error) {
    console.error("❌ Error checking user permission:", error);
    return true; // default to true on error for backward compatibility
  }
}
