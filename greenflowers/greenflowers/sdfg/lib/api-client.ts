// По умолчанию без REST: чтение через Firestore (tryFirestoreGet + отдельные методы api.*).
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");

type FsCtx = { db: import("firebase/firestore").Firestore; uid: string; legacyId: number };
let _ctxCache: FsCtx | null = null;
let _ctxCacheUid: string | null = null;

async function getClientFsContext(): Promise<FsCtx | null> {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("greenflowers_user");
  if (!raw) { _ctxCache = null; _ctxCacheUid = null; return null; }
  let ju: { firebaseUid?: string; id?: number };
  try { ju = JSON.parse(raw); } catch { return null; }
  if (!ju.firebaseUid) return null;

  if (_ctxCache && _ctxCacheUid === ju.firebaseUid) return _ctxCache;

  const { getFirebaseAuth, getFirestoreDb } = await import("./firebase");
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  if (!db || !auth) return null;

  let user = auth.currentUser;
  if (!user) {
    const { onAuthStateChanged } = await import("firebase/auth");
    user = await new Promise<import("firebase/auth").User | null>((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u); });
      setTimeout(() => { resolve(null); }, 3000);
    });
  }

  if (!user || user.uid !== ju.firebaseUid) return null;
  _ctxCache = { db, uid: user.uid, legacyId: Number(ju.id) || 0 };
  _ctxCacheUid = user.uid;
  return _ctxCache;
}

/** Роли admin/worker из localStorage (employee → worker), для записи товаров в Firestore */
function getStaffRoleFromLocalStorage(): "admin" | "worker" | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("greenflowers_user");
  if (!raw) return null;
  try {
    const ju = JSON.parse(raw) as { role?: string };
    const lowered = String(ju.role || "").trim().toLowerCase();
    const r = lowered === "employee" ? "worker" : lowered;
    if (r === "admin" || r === "worker") return r;
    return null;
  } catch {
    return null;
  }
}

/** Staff или админ (учёт регистра роли в JSON). */
function canUseStaffFirestore(): boolean {
  return (
    getStaffRoleFromLocalStorage() !== null || isAdminRoleLocalStorage()
  );
}

/** Админ по полю role в localStorage (без employee→worker), для разрешений */
function isAdminRoleLocalStorage(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem("greenflowers_user");
  if (!raw) return false;
  try {
    const ju = JSON.parse(raw) as { role?: string };
    return String(ju.role || "").toLowerCase() === "admin";
  } catch {
    return false;
  }
}

function stripProductClientFields(productData: Record<string, any>) {
  const { _imageFile, ...rest } = productData;
  return rest;
}

/** Каталог и заказы без sprayApi: Firestore */
async function tryFirestoreGet(endpoint: string): Promise<any | undefined> {
  const path = endpoint.split("?")[0];

  if (path.startsWith("/permissions/")) {
    return {
      success: true,
      permissions: {
        create_product: true,
        create_batch: true,
        edit_truck: true,
        edit_position: true,
      },
    };
  }

  const orderMatch = /^\/orders\/([^/]+)$/.exec(path);
  if (orderMatch?.[1] && !["all", "user"].includes(orderMatch[1])) {
    if (typeof window === "undefined") return undefined;
    const ctx = await getClientFsContext();
    if (!ctx) {
      return { success: false, error: "Требуется вход в аккаунт" };
    }
    const staff = canUseStaffFirestore();
    const { getOrderByIdFirestore } = await import("./gf-firestore/orders");
    return getOrderByIdFirestore(ctx.db, orderMatch[1], ctx.uid, staff);
  }

  const { getFirestoreDb } = await import("./firebase");
  const db = getFirestoreDb();
  if (!db) return undefined;
  if (path.startsWith("/catalog/batches")) {
    const { getCatalogBatches } = await import("./gf-firestore/catalog");
    return getCatalogBatches(db);
  }
  if (path.includes("inventory-items/categories/available")) {
    const { getAvailableCategories } = await import("./gf-firestore/catalog");
    return getAvailableCategories(db);
  }
  if (path.includes("inventory-items/all-available")) {
    const { getAllAvailableProducts } = await import("./gf-firestore/catalog");
    return getAllAvailableProducts(db);
  }
  return undefined;
}

class ApiClient {
  baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  buildQuery(params?: Record<string, any>) {
    const safe: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) safe[k] = String(v);
      });
    }
    return new URLSearchParams(safe).toString();
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const method = (options.method || "GET").toUpperCase();
    if (method === "GET") {
      const fs = await tryFirestoreGet(endpoint);
      if (fs !== undefined) return fs;
    }
    if (!this.baseURL) {
      return {
        success: false,
        error:
          "Эта операция не реализована в режиме только Firebase. Подключите REST API (NEXT_PUBLIC_API_URL) или используйте экраны с данными из Firestore.",
      };
    }
    const url = `${this.baseURL}${endpoint}`;
    // Build headers carefully: do NOT set Content-Type for FormData bodies
    const headers: Record<string, string> = {};
    if (options.body instanceof FormData) {
      Object.assign(headers, (options.headers as Record<string, string>) || {});
      if ("Content-Type" in headers) delete headers["Content-Type"];
    } else {
      Object.assign(headers, {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
      });
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      const contentType = response.headers.get("content-type") || "";
      console.log(
        `[API] ${endpoint} - Status: ${response.status}, Content-Type: ${contentType}`,
      );

      // Если ответ JSON — парсим как раньше
      if (contentType.includes("application/json")) {
        const data = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        if (!response.ok) {
          return {
            success: false,
            error:
              data.error || `HTTP ${response.status}: ${response.statusText}`,
            ...data,
          };
        }
        return data;
      }

      // Если это CSV — возвращаем текст (чтобы frontend мог создать Blob из строки)
      if (
        contentType.includes("text/csv") ||
        contentType.includes("text/plain")
      ) {
        const text = await response.text();
        console.log(`[API] ${endpoint} - text length: ${text.length}`);
        if (!response.ok) {
          const trimmed = text.trim();
          if (trimmed.startsWith("{")) {
            try {
              const data = JSON.parse(trimmed);
              return {
                success: false,
                error:
                  data.error ||
                  `HTTP ${response.status}: ${response.statusText}`,
                ...data,
              };
            } catch {
              /* fall through */
            }
          }
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            details: trimmed || undefined,
          };
        }
        return text;
      }

      // Если это бинарный файл (xlsx) — возвращаем Blob
      if (
        contentType.includes(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ) ||
        contentType.includes("application/octet-stream")
      ) {
        const blob = await response.blob();
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        return blob;
      }

      // По умолчанию пытаемся распарсить как JSON, иначе вернуть текст
      try {
        // Read response body once to avoid stream already read error
        const text = await response.text();

        try {
          // Try to parse as JSON
          const data = JSON.parse(text);
          if (!response.ok) {
            return {
              success: false,
              error:
                data.error || `HTTP ${response.status}: ${response.statusText}`,
              ...data,
            };
          }
          return data;
        } catch (parseError) {
          // If not valid JSON, return as text
          if (!response.ok) {
            return {
              success: false,
              error: `HTTP ${response.status}: ${response.statusText}`,
            };
          }
          return text;
        }
      } catch (error) {
        console.error("API Request Error:", error);
        // Возвращаем ошибку вместо выброса
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    } catch (outerError) {
      console.error("API Request Failed:", outerError);
      return {
        success: false,
        error:
          outerError instanceof Error ? outerError.message : "Request failed",
      };
    }
  }

  // ============ AUTH ============
  async register(userData: any) {
    if (!API_URL) {
      return {
        success: false,
        error:
          "Создание пользователя с email/паролем без серверного API недоступно. Попросите клиента войти по телефону в приложении или задайте NEXT_PUBLIC_API_URL.",
      };
    }
    return this.request("/users/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  /**
   * Админка: создать пользователя (Firebase Auth + profiles) без REST / NEXT_PUBLIC_API_URL.
   */
  async adminCreateUserWithEmail(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    city?: string;
    company_name?: string;
    role?: string;
    is_active?: boolean;
  }) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff === "admin") {
      const { adminCreateEmailUserFirestore } = await import(
        "./gf-firestore/admin-create-user"
      );
      return adminCreateEmailUserFirestore(ctx.db, {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        phone: userData.phone,
        city: userData.city,
        company_name: userData.company_name,
        role: userData.role ?? "user",
        is_active: userData.is_active !== false,
      });
    }
    if (API_URL) {
      return this.request("/users/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    }
    return {
      success: false,
      error: "Доступно только администратору с активной сессией Firebase.",
    };
  }

  async sendSmsCode(phone: string) {
    return this.request("/users/send-sms-code", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }

  async loginWithCode(
    phone: string,
    code: string,
    name?: string,
    city?: string,
  ) {
    const payload = {
      phone,
      code: String(code ?? "").trim(),
      ...(name !== undefined ? { name } : {}),
      ...(city !== undefined ? { city } : {}),
    };
    return this.request("/users/login-phone", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async login(email: string, password: string) {
    return this.request("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // ============ USERS (Admin) — список из Firestore profiles без REST ============
  async getAllUsers(adminId: number) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff === "admin") {
      const { listProfilesForAdmin } = await import(
        "./gf-firestore/admin-users"
      );
      return listProfilesForAdmin(ctx.db);
    }
    return this.request(`/users/admin/users?adminId=${adminId}`);
  }

  async getWorkerUsers(workerId: number) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff === "worker") {
      const { listProfilesForWorker } = await import(
        "./gf-firestore/admin-users"
      );
      return listProfilesForWorker(ctx.db);
    }
    return this.request(`/users/worker/users?workerId=${workerId}`);
  }

  async updateUserRole(
    adminId: number,
    userId: number,
    newRole: string,
    profileUid?: string,
  ) {
    const ctx = await getClientFsContext();
    if (ctx?.db && isAdminRoleLocalStorage()) {
      const { updateUserRoleFirestore } = await import(
        "./gf-firestore/admin-users"
      );
      return updateUserRoleFirestore(ctx.db, userId, newRole, profileUid);
    }
    return this.request(`/users/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ adminId, newRole }),
    });
  }

  async deleteUser(adminId: number, userId: number, profileUid?: string) {
    const ctx = await getClientFsContext();
    if (ctx?.db && isAdminRoleLocalStorage()) {
      const { deactivateUserProfileFirestore } = await import(
        "./gf-firestore/admin-users"
      );
      return deactivateUserProfileFirestore(ctx.db, userId, profileUid);
    }
    return this.request(`/users/admin/users/${userId}?adminId=${adminId}`, {
      method: "DELETE",
    });
  }

  async updateUser(
    adminId: number,
    userId: number,
    userData: any,
    profileUid?: string,
  ) {
    const ctx = await getClientFsContext();
    if (ctx?.db && isAdminRoleLocalStorage()) {
      const { updateUserProfileFirestore } = await import(
        "./gf-firestore/admin-users"
      );
      return updateUserProfileFirestore(ctx.db, userId, userData, profileUid);
    }
    return this.request(`/users/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ adminId, ...userData }),
    });
  }

  async changeUserPassword(
    adminId: number,
    userId: number,
    newPassword: string,
  ) {
    return this.request(`/users/admin/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ adminId, newPassword }),
    });
  }

  // ============ CLIENTS (CRM) ============
  async getClients(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDir?: string;
  }) {
    const query = this.buildQuery(params as any);
    return this.request(`/clients${query ? "?" + query : ""}`);
  }

  async getClient(id: number) {
    return this.request(`/clients/${id}`);
  }

  async createClient(data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    comment?: string;
  }) {
    return this.request(`/clients`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: number, data: any) {
    return this.request(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: number) {
    return this.request(`/clients/${id}`, { method: "DELETE" });
  }

  // ============ PRODUCTS ============
  async getProducts() {
    const { getFirestoreDb } = await import("./firebase");
    const db = getFirestoreDb();
    if (db) {
      const { getAllAvailableProducts } = await import("./gf-firestore/catalog");
      const r = await getAllAvailableProducts(db);
      return { success: true, products: r.data };
    }
    return this.request("/products");
  }

  async getProduct(id: number) {
    const { getFirestoreDb } = await import("./firebase");
    const db = getFirestoreDb();
    if (db) {
      const { getProductById } = await import("./gf-firestore/catalog");
      return getProductById(db, id);
    }
    return this.request(`/products/${id}`);
  }

  async createProduct(userId: number, productData: any) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx && staff) {
      const { getFirebaseApp } = await import("./firebase");
      const app = getFirebaseApp();
      if (app) {
        const imageFile = productData?._imageFile as File | undefined;
        const clean = stripProductClientFields(productData);
        const { createProductFirestore } = await import(
          "./gf-firestore/products-admin"
        );
        return createProductFirestore(ctx.db, app, clean, imageFile);
      }
    }
    const clean = stripProductClientFields(productData);
    return this.request("/products", {
      method: "POST",
      body: JSON.stringify({ userId, ...clean }),
    });
  }

  async updateProduct(userId: number, productId: number, productData: any) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx && staff) {
      const { getFirebaseApp } = await import("./firebase");
      const app = getFirebaseApp();
      if (app) {
        const imageFile = productData?._imageFile as File | undefined;
        const clean = stripProductClientFields(productData);
        const { updateProductFirestore } = await import(
          "./gf-firestore/products-admin"
        );
        return updateProductFirestore(
          ctx.db,
          app,
          productId,
          clean,
          imageFile,
        );
      }
    }
    const clean = stripProductClientFields(productData);
    return this.request(`/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ userId, ...clean }),
    });
  }

  async deleteProduct(adminId: number, productId: number) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx && staff) {
      const { deleteProductFirestore } = await import(
        "./gf-firestore/products-admin"
      );
      return deleteProductFirestore(ctx.db, productId);
    }
    return this.request(`/products/${productId}?adminId=${adminId}`, {
      method: "DELETE",
    });
  }

  // ============ ORDERS ============
  async createOrder(orderData: any) {
    const ctx = await getClientFsContext();
    if (ctx) {
      const { createOrderFirestore } = await import("./gf-firestore/orders");
      return createOrderFirestore(ctx.db, ctx.uid, ctx.legacyId, orderData);
    }
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  }

  async getOrder(orderId: string | number) {
    const ctx = await getClientFsContext();
    if (ctx) {
      const staff = canUseStaffFirestore();
      const { getOrderByIdFirestore } = await import("./gf-firestore/orders");
      return getOrderByIdFirestore(ctx.db, String(orderId), ctx.uid, staff);
    }
    return this.request(`/orders/${orderId}`);
  }

  async getUserOrders(userId: number) {
    const ctx = await getClientFsContext();
    if (ctx && ctx.legacyId === userId) {
      const { getUserOrdersFirestore } = await import("./gf-firestore/orders");
      return getUserOrdersFirestore(ctx.db, ctx.uid);
    }
    return this.request(`/orders/user/${userId}`);
  }

  async deleteOrders(orderIds: (number | string)[], userId?: number) {
    const ctx = await getClientFsContext();
    if (ctx && canUseStaffFirestore()) {
      const { deleteOrdersFirestore } = await import("./gf-firestore/orders");
      return deleteOrdersFirestore(ctx.db, orderIds.map(String));
    }
    return this.request("/orders", {
      method: "DELETE",
      body: JSON.stringify({ ids: orderIds, user_id: userId }),
    });
  }

  async getAllOrders(_userId?: number) {
    const ctx = await getClientFsContext();
    if (ctx && canUseStaffFirestore()) {
      const { getAllOrdersFirestore } = await import("./gf-firestore/orders");
      return getAllOrdersFirestore(ctx.db);
    }
    return this.request(`/orders/all?userId=${_userId || 1}`);
  }

  async confirmOrder(userId: number, orderId: number | string) {
    return this.request(`/orders/${orderId}/confirm`, {
      method: "PUT",
      body: JSON.stringify({ userId }),
    });
  }

  async updateOrderStatus(userId: number, orderId: number | string, status: string) {
    const ctx = await getClientFsContext();
    if (ctx && canUseStaffFirestore()) {
      const { updateOrderStatusFirestore } = await import("./gf-firestore/orders");
      return updateOrderStatusFirestore(ctx.db, String(orderId), status);
    }
    return this.request(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ userId, status }),
    });
  }

  async updateOrderDiscount(
    userId: number,
    orderId: number | string,
    payload: {
      total_amount: number;
      discount: { type: "fixed" | "percent"; value: number };
      discount_amount: number;
    },
  ) {
    const ctx = await getClientFsContext();
    if (ctx && canUseStaffFirestore()) {
      const { updateOrderDiscountFirestore } = await import("./gf-firestore/orders");
      return updateOrderDiscountFirestore(ctx.db, String(orderId), payload);
    }
    return { success: false as const, error: "Нет прав или нет входа" };
  }

  async takeOrder(userId: number, orderId: number | string) {
    const ctx = await getClientFsContext();
    if (ctx && canUseStaffFirestore()) {
      const { takeOrderFirestore } = await import("./gf-firestore/orders");
      return takeOrderFirestore(ctx.db, String(orderId), userId);
    }
    return this.request(`/orders/${orderId}/take`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  }

  async refundOrder(userId: number, orderId: number | string) {
    const ctx = await getClientFsContext();
    if (ctx && canUseStaffFirestore()) {
      const { refundOrderFirestore } = await import("./gf-firestore/orders");
      const res = await refundOrderFirestore(ctx.db, String(orderId));
      if (!res.success) {
        return { success: false as const, error: res.error || "Возврат не выполнен" };
      }
      return res;
    }
    return this.request(`/orders/${orderId}/refund`, {
      method: "PUT",
      body: JSON.stringify({ userId }),
    });
  }

  async downloadInvoice(orderId: number | string, userId?: number) {
    // Try Firestore-based client-side generation first
    const ctx = await getClientFsContext();
    if (ctx) {
      const staff = canUseStaffFirestore();
      const { getOrderByIdFirestore } = await import("./gf-firestore/orders");
      const order = await getOrderByIdFirestore(ctx.db, String(orderId), ctx.uid, staff);
      if (order && order.id) {
        this._generateAndDownloadInvoiceHtml(order);
        return;
      }
    }
    if (!this.baseURL) {
      throw new Error(
        "Счёт в PDF доступен только при подключённом серверном API (NEXT_PUBLIC_API_URL).",
      );
    }
    const query = userId ? `?userId=${userId}` : "";
    const response = await fetch(
      `${this.baseURL}/orders/${orderId}/invoice${query}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice_${orderId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /** Generate a printable HTML invoice and trigger print dialog (saves as PDF) */
  private _generateAndDownloadInvoiceHtml(order: any) {
    const items: Array<{ product_name: string; quantity: number; unit_price: number }> =
      Array.isArray(order.items) ? order.items : [];
    const total = Number(order.total_amount) || 0;
    const orderNum = order.order_number || `#${String(order.id).slice(-8)}`;
    const date = order.created_at
      ? new Date(order.created_at).toLocaleDateString("ru-RU")
      : new Date().toLocaleDateString("ru-RU");

    const rows = items
      .map(
        (it, i) =>
          `<tr>
            <td style="border:1px solid #ddd;padding:8px;text-align:center">${i + 1}</td>
            <td style="border:1px solid #ddd;padding:8px">${it.product_name || "Товар"}</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:center">${it.quantity}</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:right">${Number(it.unit_price).toLocaleString("ru-RU")} ₸</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:right">${(it.quantity * Number(it.unit_price)).toLocaleString("ru-RU")} ₸</td>
          </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Накладная ${orderNum}</title>
<style>
  body{font-family:Arial,sans-serif;margin:40px;color:#333}
  h1{font-size:24px;margin-bottom:4px}
  .meta{color:#666;margin-bottom:20px}
  table{border-collapse:collapse;width:100%}
  th{background:#f5f5f5;border:1px solid #ddd;padding:8px;text-align:left}
  .total{text-align:right;font-size:18px;font-weight:bold;margin-top:16px}
  .customer{margin:16px 0;line-height:1.6}
  @media print{body{margin:20px}}
</style>
</head><body>
<h1>Накладная ${orderNum}</h1>
<p class="meta">Дата: ${date}</p>
<div class="customer">
  <strong>Клиент:</strong> ${order.customer_name || "—"}<br/>
  <strong>Телефон:</strong> ${order.customer_phone || "—"}<br/>
  <strong>Город:</strong> ${order.city || order.delivery_city || "—"}<br/>
  <strong>Адрес:</strong> ${order.delivery_address || "—"}
</div>
<table>
  <thead><tr>
    <th style="width:40px">#</th><th>Товар</th><th style="width:60px">Кол-во</th><th style="width:100px">Цена</th><th style="width:100px">Сумма</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<p class="total">Итого: ${total.toLocaleString("ru-RU")} ₸</p>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 400);
    }
  }

  // ============ PREORDERS ============
  async getUserPreorders(userId: number) {
    return this.request(`/preorders/user/${userId}`);
  }

  async getAllPreorders(userId: number) {
    return this.request(`/preorders/all?userId=${userId}`);
  }

  // ============ LOGS (Admin) ============
  async getLogs(adminId: number, filters: any = {}) {
    const params = new URLSearchParams({
      adminId: adminId.toString(),
      ...filters,
    });
    return this.request(`/logs?${params.toString()}`);
  }

  async getLogsStats(adminId: number) {
    return this.request(`/logs/stats?adminId=${adminId}`);
  }

  async cleanOldLogs(adminId: number, days: number = 90) {
    return this.request("/logs/clean", {
      method: "DELETE",
      body: JSON.stringify({ adminId, days }),
    });
  }

  // ============ FLOWERS (Admin & Worker) ============
  async getFlowers() {
    return this.request("/flowers");
  }

  async getFlower(id: number) {
    return this.request(`/flowers/${id}`);
  }

  async createFlower(userId: number, flowerData: any) {
    return this.request("/flowers", {
      method: "POST",
      body: JSON.stringify({ userId, ...flowerData }),
    });
  }

  async updateFlower(userId: number, flowerId: number, flowerData: any) {
    return this.request(`/flowers/${flowerId}`, {
      method: "PUT",
      body: JSON.stringify({ userId, ...flowerData }),
    });
  }

  async deleteFlower(adminId: number, flowerId: number) {
    return this.request(`/flowers/${flowerId}?adminId=${adminId}`, {
      method: "DELETE",
    });
  }

  // ============ USER PROFILE ============
  async updateProfile(userId: number, profileData: any) {
    return this.request(`/users/profile/${userId}`, {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async updateProfile(profileData: any) {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async getProfileStats(userId: number) {
    return this.request(`/users/profile/${userId}/stats`);
  }

  // ============ CART ============
  async getCart(userId: number) {
    const ctx = await getClientFsContext();
    if (ctx && ctx.legacyId === userId) {
      const { loadCartFirestore } = await import("./gf-firestore/cart");
      return loadCartFirestore(ctx.db, ctx.uid, ctx.legacyId);
    }
    return this.request(`/cart/user/${userId}`);
  }

  async addToCart(
    userId: number,
    product_id: number,
    quantity: number,
    truck_id?: string | number | null,
    unit_price?: number | null,
    meta?: {
      firestoreDocId?: string;
      lineKind?: "product" | "inventory";
    },
  ) {
    const ctx = await getClientFsContext();
    if (ctx && ctx.legacyId === userId) {
      const { addToCartFirestore } = await import("./gf-firestore/cart");
      return addToCartFirestore(
        ctx.db,
        ctx.uid,
        ctx.legacyId,
        product_id,
        quantity,
        truck_id != null ? String(truck_id) : null,
        unit_price ?? 0,
        meta,
      );
    }
    const body: any = { userId, product_id, quantity, truck_id };
    if (unit_price !== null && unit_price !== undefined) {
      body.unit_price = unit_price;
    }
    return this.request("/cart", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async updateCartItem(itemId: number, userId: number, quantity: number) {
    const ctx = await getClientFsContext();
    if (ctx && ctx.legacyId === userId) {
      const { updateQuantityFirestore } = await import("./gf-firestore/cart");
      return updateQuantityFirestore(ctx.db, ctx.uid, itemId, quantity);
    }
    return this.request(`/cart/${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ userId, quantity }),
    });
  }

  async removeFromCart(itemId: number, userId: number) {
    const ctx = await getClientFsContext();
    if (ctx && ctx.legacyId === userId) {
      const { removeFromCartFirestore } = await import("./gf-firestore/cart");
      return removeFromCartFirestore(ctx.db, ctx.uid, itemId);
    }
    return this.request(`/cart/${itemId}?userId=${userId}`, {
      method: "DELETE",
    });
  }

  async clearCart(userId: number) {
    const ctx = await getClientFsContext();
    if (ctx && ctx.legacyId === userId) {
      const { clearCartFirestore } = await import("./gf-firestore/cart");
      return clearCartFirestore(ctx.db, ctx.uid);
    }
    return this.request(`/cart/user/${userId}/clear`, {
      method: "DELETE",
    });
  }

  // ============ INVENTORY (Поставки товаров) ============
  async getInventoryBatches(params?: {
    userId?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    const query = this.buildQuery(params as any);
    return this.request(`/inventory/batches${query ? "?" + query : ""}`);
  }

  async getInventoryBatch(id: number) {
    return this.request(`/inventory/batches/${id}`);
  }

  async createInventoryBatch(data: {
    userId: number;
    batchDate: string;
    supplierName?: string;
    notes?: string;
    items: any[];
  }) {
    return this.request("/inventory/batches", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateInventoryBatch(id: number, data: any) {
    return this.request(`/inventory/batches/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteInventoryBatch(id: number, userId: number) {
    return this.request(`/inventory/batches/${id}?userId=${userId}`, {
      method: "DELETE",
    });
  }

  async getInventoryPriceComparison(params?: {
    productName?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const query = this.buildQuery(params as any);
    return this.request(
      `/inventory/analytics/price-comparison${query ? "?" + query : ""}`,
    );
  }

  async getInventoryByCategory(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const query = this.buildQuery(params as any);
    return this.request(
      `/inventory/analytics/by-category${query ? "?" + query : ""}`,
    );
  }

  async exportInventoryCSV(params?: {
    batchId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const query = this.buildQuery(params as any);
    return this.request(`/inventory/export/csv${query ? "?" + query : ""}`);
  }

  async exportInventoryJSON(params?: {
    batchId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const query = this.buildQuery(params as any);
    return this.request(`/inventory/export/json${query ? "?" + query : ""}`);
  }

  // ============ SHIFTS (Смены продавцов) ============
  async getCurrentShift(userId: number) {
    return this.request(`/shifts/current/${userId}`);
  }

  async getShifts(params?: {
    userId?: number;
    startDate?: string;
    endDate?: string;
    sellerId?: number;
    status?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/shifts${query ? "?" + query : ""}`);
  }

  async getShift(id: number) {
    return this.request(`/shifts/${id}`);
  }

  async openShift(data: {
    userId: number;
    openingCash?: number;
    notes?: string;
  }) {
    return this.request("/shifts/open", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async closeShift(data: {
    userId: number;
    shiftId: number;
    closingCash: number;
    notes?: string;
  }) {
    return this.request("/shifts/close", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async addShiftSale(data: {
    shiftId: number;
    orderId?: number;
    saleAmount: number;
    discountAmount?: number;
    paymentMethod?: string;
    notes?: string;
  }) {
    return this.request("/shifts/sale", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateShiftSale(
    saleId: number,
    data: {
      saleAmount?: number;
      discountAmount?: number;
      paymentMethod?: string;
      notes?: string;
    },
  ) {
    return this.request(`/shifts/sales/${saleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteShiftSale(saleId: number) {
    return this.request(`/shifts/sales/${saleId}`, {
      method: "DELETE",
    });
  }

  async getSellerActiveOrders(sellerId: number) {
    return this.request(`/shifts/seller/${sellerId}/active-orders`);
  }

  async getShiftAnalyticsBySeller(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(
      `/shifts/analytics/by-seller${query ? "?" + query : ""}`,
    );
  }

  async getShiftAnalyticsByDay(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/shifts/analytics/by-day${query ? "?" + query : ""}`);
  }

  async exportShiftsCSV(params?: {
    startDate?: string;
    endDate?: string;
    sellerId?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/shifts/export/csv${query ? "?" + query : ""}`);
  }

  // ============ CALENDAR (Календарь и аналитика) ============
  async getCalendarEvents(params?: {
    startDate?: string;
    endDate?: string;
    eventType?: string;
    priority?: string;
    isRead?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/calendar/events${query ? "?" + query : ""}`);
  }

  async getCalendarMonthEvents(year: number, month: number) {
    return this.request(`/calendar/events/month/${year}/${month}`);
  }

  async createCalendarEvent(data: {
    userId: number;
    eventDate: string;
    eventType?: string;
    title: string;
    description?: string;
    priority?: string;
  }) {
    return this.request("/calendar/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCalendarEvent(
    id: number,
    data: {
      title?: string;
      description?: string;
      priority?: string;
      isRead?: boolean;
    },
  ) {
    return this.request(`/calendar/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async markEventAsRead(id: number) {
    return this.request(`/calendar/events/${id}/read`, {
      method: "POST",
    });
  }

  async deleteCalendarEvent(id: number, userId: number) {
    return this.request(`/calendar/events/${id}?userId=${userId}`, {
      method: "DELETE",
    });
  }

  async getAnalyticsThresholds() {
    return this.request("/calendar/thresholds");
  }

  async updateAnalyticsThreshold(
    type: string,
    data: { userId: number; value?: number; isActive?: boolean },
  ) {
    return this.request(`/calendar/thresholds/${type}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getAnalyticsSummary(params?: { startDate?: string; endDate?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/calendar/summary${query ? "?" + query : ""}`);
  }

  async getTopProducts(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/calendar/top-products${query ? "?" + query : ""}`);
  }

  async getAvailableOrders() {
    return this.request("/shifts/available-orders");
  }

  async acceptOrder(orderId: number, sellerId: number) {
    return this.request(`/shifts/accept-order/${orderId}/${sellerId}`, {
      method: "POST",
    });
  }

  async exportShiftsExcel(shiftId: number) {
    const url = `${this.baseURL}/shifts/export/excel/${shiftId}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Shift_${shiftId}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      return { success: true };
    } catch (error) {
      console.error("Export Error:", error);
      throw error;
    }
  }

  async generateCalendarEvents(userId: number) {
    return this.request("/calendar/generate-events", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  }

  // Trucks (Фуры) — Firestore при отсутствии NEXT_PUBLIC_API_URL
  async getAllTrucks() {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { listTrucksFirestore } = await import(
        "./gf-firestore/trucks-inventory"
      );
      return listTrucksFirestore(ctx.db);
    }
    return this.request("/trucks");
  }

  async getTruck(id: string) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { getTruckFirestore } = await import(
        "./gf-firestore/trucks-inventory"
      );
      return getTruckFirestore(ctx.db, id);
    }
    return this.request(`/trucks/${id}`);
  }

  async createTruck(data: {
    identifier: string;
    arrival_date: string;
    status?: string;
  }) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { createTruckFirestore } = await import(
        "./gf-firestore/trucks-inventory"
      );
      return createTruckFirestore(ctx.db, ctx.uid, data);
    }
    return this.request("/trucks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTruck(id: string, data: any) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { updateTruckFirestore } = await import(
        "./gf-firestore/trucks-inventory"
      );
      return updateTruckFirestore(ctx.db, id, data);
    }
    return this.request(`/trucks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTruck(id: string) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { deleteTruckFirestore } = await import(
        "./gf-firestore/trucks-inventory"
      );
      return deleteTruckFirestore(ctx.db, id);
    }
    return this.request(`/trucks/${id}`, {
      method: "DELETE",
    });
  }

  async getInventoryItems(truckId: string) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { listInventoryItemsForTruck } = await import(
        "./gf-firestore/trucks-inventory"
      );
      return listInventoryItemsForTruck(ctx.db, truckId);
    }
    return this.request(`/inventory-items/truck/${truckId}`);
  }

  async createInventoryItem(formData: FormData) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { getFirebaseApp } = await import("./firebase");
      const app = getFirebaseApp();
      if (app) {
        const { createInventoryItemFromFormData } = await import(
          "./gf-firestore/trucks-inventory"
        );
        return createInventoryItemFromFormData(ctx.db, app, formData);
      }
    }
    const config: RequestInit = {
      method: "POST",
      body: formData,
    };
    const { headers, ...rest } = config;
    const newConfig = {
      ...rest,
      headers:
        headers && "Content-Type" in headers
          ? Object.fromEntries(
              Object.entries(headers).filter(([k]) => k !== "Content-Type"),
            )
          : {},
    };
    return this.request("/inventory-items", newConfig);
  }

  async updateInventoryItem(itemId: number, data: any) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { updateInventoryItemFirestore } = await import(
        "./gf-firestore/trucks-inventory"
      );
      return updateInventoryItemFirestore(ctx.db, itemId, data);
    }
    return this.request(`/inventory-items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteInventoryItem(itemId: number) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { deleteInventoryItemFirestore } = await import(
        "./gf-firestore/trucks-inventory"
      );
      return deleteInventoryItemFirestore(ctx.db, itemId);
    }
    return this.request(`/inventory-items/${itemId}`, {
      method: "DELETE",
    });
  }

  async getFlowerCategories() {
    const { getFirestoreDb } = await import("./firebase");
    const db = getFirestoreDb();
    if (db) {
      const { listMergedFlowerCategories } = await import(
        "./gf-firestore/flower-categories"
      );
      return listMergedFlowerCategories(db);
    }
    return this.request("/flower-categories");
  }

  async getAvailableInventoryCategories() {
    const { getFirestoreDb } = await import("./firebase");
    const db = getFirestoreDb();
    if (db) {
      const { getAvailableCategories } = await import(
        "./gf-firestore/catalog"
      );
      return getAvailableCategories(db);
    }
    return this.request("/inventory-items/categories/available");
  }

  /** Админка: счётчики заказов по городам (без REST) */
  async getAdminCityStats() {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { getCityOrderCountsFirestore } = await import(
        "./gf-firestore/admin-analytics"
      );
      return getCityOrderCountsFirestore(ctx.db);
    }
    return [];
  }

  async getAdminManagers() {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { listManagersFromProfilesFirestore } = await import(
        "./gf-firestore/admin-analytics"
      );
      return listManagersFromProfilesFirestore(ctx.db);
    }
    return [];
  }

  async getManagerPermissions(profileUid: string) {
    const ctx = await getClientFsContext();
    if (ctx?.db && isAdminRoleLocalStorage()) {
      const { getManagerPermissionsFirestore } = await import(
        "./gf-firestore/manager-permissions",
      );
      return getManagerPermissionsFirestore(ctx.db, profileUid);
    }
    return { success: false, error: "Только для администратора" };
  }

  async setManagerPermissions(
    profileUid: string,
    permissions: {
      create_product: boolean;
      create_batch: boolean;
      edit_truck: boolean;
      edit_position: boolean;
    },
  ) {
    const ctx = await getClientFsContext();
    if (ctx?.db && isAdminRoleLocalStorage()) {
      const { setManagerPermissionsFirestore } = await import(
        "./gf-firestore/manager-permissions",
      );
      return setManagerPermissionsFirestore(ctx.db, profileUid, permissions);
    }
    return { success: false, error: "Только для администратора" };
  }

  async getCityAnalyticsAdmin(
    city: string,
    startDate?: string,
    endDate?: string,
  ) {
    const ctx = await getClientFsContext();
    if (ctx?.db && canUseStaffFirestore()) {
      const { getCityAnalyticsDetailFirestore } = await import(
        "./gf-firestore/admin-analytics"
      );
      return getCityAnalyticsDetailFirestore(ctx.db, city, startDate, endDate);
    }
    return null;
  }

  async getPreorderBannerSettings() {
    const { getFirestoreDb } = await import("./firebase");
    const db = getFirestoreDb();
    if (!db) {
      const { DEFAULT_PREORDER_BANNER } = await import(
        "./gf-firestore/preorder-banner-settings"
      );
      return { success: true as const, data: { ...DEFAULT_PREORDER_BANNER } };
    }
    const { getPreorderBannerSettingsFirestore } = await import(
      "./gf-firestore/preorder-banner-settings"
    );
    return getPreorderBannerSettingsFirestore(db);
  }

  async savePreorderBannerSettingsAdmin(
    patch: Partial<{
      visible: boolean;
      deadline_text: string;
      discount_percent: number;
      whatsapp_digits: string;
    }>,
  ) {
    const ctx = await getClientFsContext();
    if (!ctx?.db || !canUseStaffFirestore()) {
      return { success: false as const, error: "Недостаточно прав или нет входа" };
    }
    const { setPreorderBannerSettingsFirestore } = await import(
      "./gf-firestore/preorder-banner-settings"
    );
    return setPreorderBannerSettingsFirestore(ctx.db, patch);
  }

  async getAvailableInventoryItems() {
    const { getFirestoreDb } = await import("./firebase");
    const db = getFirestoreDb();
    if (db) {
      const { getAllAvailableProducts } = await import("./gf-firestore/catalog");
      return getAllAvailableProducts(db);
    }
    return this.request("/inventory-items/all-available");
  }

  async getFlowerCategory(id: number) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { getFlowerCategoryFirestore } = await import(
        "./gf-firestore/flower-categories"
      );
      return getFlowerCategoryFirestore(ctx.db, id);
    }
    return this.request(`/flower-categories/${id}`);
  }

  async createFlowerCategory(data: { name: string; description?: string }) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { createFlowerCategoryFirestore } = await import(
        "./gf-firestore/flower-categories"
      );
      return createFlowerCategoryFirestore(ctx.db, data);
    }
    return this.request("/flower-categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateFlowerCategory(
    id: number,
    data: { name?: string; description?: string },
  ) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { updateFlowerCategoryFirestore } = await import(
        "./gf-firestore/flower-categories"
      );
      return updateFlowerCategoryFirestore(ctx.db, id, data);
    }
    return this.request(`/flower-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteFlowerCategory(id: number) {
    if (id < 0) {
      return {
        success: false,
        error:
          "Категория только из товаров — сначала смените её у позиций, затем добавьте в справочник при необходимости.",
      };
    }
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { deleteFlowerCategoryFirestore } = await import(
        "./gf-firestore/flower-categories"
      );
      return deleteFlowerCategoryFirestore(ctx.db, id);
    }
    return this.request(`/flower-categories/${id}`, {
      method: "DELETE",
    });
  }

  // =============================================
  // COMMISSION/BONUS ENDPOINTS
  // =============================================

  async getCommissionByTruckCity(
    truckId: number | string,
    city: string,
    userId?: number,
    role?: string,
    basePercent?: number,
  ) {
    const ctx = await getClientFsContext();
    if (ctx && getStaffRoleFromLocalStorage()) {
      const { getCommissionByTruckFirestore } = await import("./gf-firestore/commissions");
      return getCommissionByTruckFirestore(ctx.db, String(truckId), basePercent ?? 3);
    }
    const query = this.buildQuery({
      ...(userId && { userId }),
      ...(role && { role }),
      ...(basePercent != null && { basePercent }),
    });
    const endpoint = `/commissions/commission/truck/${truckId}/${encodeURIComponent(city)}${query ? "?" + query : ""}`;
    return this.request(endpoint);
  }

  async getAllCommissions(role?: string) {
    const ctx = await getClientFsContext();
    if (ctx && getStaffRoleFromLocalStorage()) {
      const { getAllCommissionsFirestore } = await import("./gf-firestore/commissions");
      return getAllCommissionsFirestore(ctx.db);
    }
    const query = this.buildQuery({ ...(role && { role }) });
    const endpoint = `/commissions/commission/all${query ? "?" + query : ""}`;
    return this.request(endpoint);
  }

  async getWorkerCommission(
    workerId: number,
    truckId: number | string,
    city: string,
    userId?: number,
    role?: string,
  ) {
    const ctx = await getClientFsContext();
    if (ctx && getStaffRoleFromLocalStorage()) {
      const { getCommissionByTruckFirestore } = await import("./gf-firestore/commissions");
      const data = await getCommissionByTruckFirestore(ctx.db, String(truckId));
      const worker = data.workers.find((w) => w.worker_id === workerId);
      return { success: true, worker: worker || null };
    }
    const query = this.buildQuery({
      ...(userId && { userId }),
      ...(role && { role }),
    });
    const endpoint = `/commissions/commission/worker/${workerId}/${truckId}/${encodeURIComponent(city)}${query ? "?" + query : ""}`;
    return this.request(endpoint);
  }

  // Get inventory value (остатки товаров) for a truck
  async getTruckInventoryTotal(truckId: string) {
    const ctx = await getClientFsContext();
    if (ctx && getStaffRoleFromLocalStorage()) {
      const { getTruckAllGoodsTotalFirestore } = await import("./gf-firestore/commissions");
      return getTruckAllGoodsTotalFirestore(ctx.db, truckId);
    }
    return this.request(`/inventory-items/truck/${truckId}/total`);
  }

  // Get total of all goods that were ever on truck (current + sold)
  async getTruckAllGoodsTotal(truckId: string) {
    const ctx = await getClientFsContext();
    if (ctx && getStaffRoleFromLocalStorage()) {
      const { getTruckAllGoodsTotalFirestore } = await import("./gf-firestore/commissions");
      return getTruckAllGoodsTotalFirestore(ctx.db, truckId);
    }
    return this.request(`/inventory-items/truck/${truckId}/all-goods-total`);
  }

  // Get total sales (сумма продаж) for delivered orders of a truck + city
  async getTruckDeliveredOrdersTotal(truckId: string, city: string) {
    const ctx = await getClientFsContext();
    if (ctx && getStaffRoleFromLocalStorage()) {
      const { getTruckDeliveredOrdersTotalFirestore } = await import("./gf-firestore/commissions");
      return getTruckDeliveredOrdersTotalFirestore(ctx.db, truckId);
    }
    const endpoint = `/commissions/truck/${truckId}/delivered-sales/${encodeURIComponent(city)}`;
    return this.request(endpoint);
  }

  // Get sales analytics for truck items by date range
  async getTruckSalesAnalytics(
    truckId: string,
    startDate: string,
    endDate: string,
  ) {
    const ctx = await getClientFsContext();
    const staff = getStaffRoleFromLocalStorage();
    if (ctx?.db && staff) {
      const { getTruckSalesAnalyticsFirestore } = await import(
        "./gf-firestore/admin-analytics"
      );
      return getTruckSalesAnalyticsFirestore(ctx.db, truckId, startDate, endDate);
    }
    return this.request(
      `/inventory-items/truck/${truckId}/sales-analytics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    );
  }

  async getTruckRefundsTotal(truckId: string, city: string) {
    const ctx = await getClientFsContext();
    if (ctx && getStaffRoleFromLocalStorage()) {
      const { getTruckRefundsTotalFirestore } = await import("./gf-firestore/commissions");
      return getTruckRefundsTotalFirestore(ctx.db, truckId);
    }
    const endpoint = `/commissions/truck/${truckId}/refunds/${encodeURIComponent(city)}`;
    return this.request(endpoint);
  }
}

export const api = new ApiClient();

// Named exports
export const register = (userData: any) => api.register(userData);
export const sendSmsCode = (phone: string) => api.sendSmsCode(phone);
export const loginWithCode = (
  phone: string,
  code: string,
  name?: string,
  city?: string,
) => api.loginWithCode(phone, code, name, city);
export const login = (email: string, password: string) =>
  api.login(email, password);
export const updateProfile = (profileData: any) =>
  api.updateProfile(profileData);
export const getProducts = () => api.getProducts();
export const getProduct = (id: number) => api.getProduct(id);
export const createOrder = (orderData: any) => api.createOrder(orderData);
export const getUserOrders = (userId: number) => api.getUserOrders(userId);
export const deleteOrders = (orderIds: number[], userId?: number) =>
  api.deleteOrders(orderIds, userId);
export const getAllOrders = (userId: number) => api.getAllOrders(userId);
export const getCart = (userId: number) => api.getCart(userId);
export const addToCart = (
  userId: number,
  product_id: number,
  quantity: number,
  truck_id?: string | number | null,
  unit_price?: number | null,
  meta?: { firestoreDocId?: string; lineKind?: "product" | "inventory" },
) => api.addToCart(userId, product_id, quantity, truck_id, unit_price, meta);
export const updateCartItem = (
  itemId: number,
  userId: number,
  quantity: number,
) => api.updateCartItem(itemId, userId, quantity);
export const removeFromCart = (itemId: number, userId: number) =>
  api.removeFromCart(itemId, userId);
export const clearCart = (userId: number) => api.clearCart(userId);
export const getClients = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}) => api.getClients(params as any);
export const getClient = (id: number) => api.getClient(id);
export const createClient = (data: {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  comment?: string;
}) => api.createClient(data);
export const updateClient = (id: number, data: any) =>
  api.updateClient(id, data);
export const deleteClient = (id: number) => api.deleteClient(id);
