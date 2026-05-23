const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(
  /\/$/,
  "",
);

export interface TruckMetric {
  name: string;
  value: string | number;
  unit?: string;
}

export interface Truck {
  id: string;
  identifier: string;
  arrival_date: string;
  status: "pending" | "in_transit" | "delivered" | "delayed";
  notes?: string;
  metrics?: TruckMetric[];
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TrucksListResponse {
  success: boolean;
  data: Truck[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AnalyticsSummary {
  total_trucks: number;
  delivered: number;
  in_transit: number;
  delayed: number;
  avg_quantity: number;
  total_quantity: number;
}

class TrucksApiClient {
  async getTrucks(
    page = 1,
    limit = 10,
    filters?: {
      identifier?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      sortBy?: string;
      order?: string;
    }
  ): Promise<TrucksListResponse> {
    if (!API_BASE_URL) {
      return {
        success: true,
        data: [],
        pagination: { page: 1, limit, total: 0, pages: 0 },
      };
    }
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy: filters?.sortBy || "arrival_date",
      order: filters?.order || "DESC",
    });

    if (filters?.identifier) params.append("identifier", filters.identifier);
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.append("dateTo", filters.dateTo);
    if (filters?.status) params.append("status", filters.status);

    const response = await fetch(`${API_BASE_URL}/trucks?${params}`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch trucks");
    return response.json();
  }

  async getTruck(id: string): Promise<{ success: boolean; data: Truck }> {
    if (!API_BASE_URL) {
      throw new Error("Транспорт недоступен без NEXT_PUBLIC_API_URL");
    }
    const response = await fetch(`${API_BASE_URL}/trucks/${id}`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch truck");
    return response.json();
  }

  async createTruck(truck: {
    identifier: string;
    arrival_date: string;
    status: string;
    notes?: string;
    metrics?: TruckMetric[];
  }): Promise<{ success: boolean; message: string; data: { id: string } }> {
    if (!API_BASE_URL) {
      throw new Error("REST API отключён (нет NEXT_PUBLIC_API_URL)");
    }
    console.log("🚛 Creating truck with data:", truck);

    const response = await fetch(`${API_BASE_URL}/trucks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(truck),
      credentials: "include",
    });

    console.log("📥 Response status:", response.status);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("❌ Server error:", errorData);
      throw new Error(errorData.error || "Failed to create truck");
    }
    return response.json();
  }

  async updateTruck(
    id: string,
    truck: {
      identifier: string;
      arrival_date: string;
      status: string;
      notes?: string;
      metrics?: TruckMetric[];
    }
  ): Promise<{ success: boolean; message: string }> {
    if (!API_BASE_URL) {
      throw new Error("REST API отключён (нет NEXT_PUBLIC_API_URL)");
    }
    const response = await fetch(`${API_BASE_URL}/trucks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(truck),
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to update truck");
    return response.json();
  }

  async deleteTruck(
    id: string
  ): Promise<{ success: boolean; message: string }> {
    if (!API_BASE_URL) {
      throw new Error("REST API отключён (нет NEXT_PUBLIC_API_URL)");
    }
    const response = await fetch(`${API_BASE_URL}/trucks/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to delete truck");
    return response.json();
  }

  async getAnalyticsSummary(): Promise<{
    success: boolean;
    data: AnalyticsSummary;
  }> {
    const response = await fetch(`${API_BASE_URL}/trucks/analytics/summary`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch analytics");
    return response.json();
  }

  async getAnalyticsByDate(dateFrom?: string, dateTo?: string): Promise<any> {
    if (!API_BASE_URL) {
      throw new Error("REST API отключён (нет NEXT_PUBLIC_API_URL)");
    }
    const params = new URLSearchParams();
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);

    const response = await fetch(
      `${API_BASE_URL}/trucks/analytics/by-date?${params}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Failed to fetch analytics by date");
    return response.json();
  }

  async exportToExcel(filters?: {
    identifier?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }): Promise<void> {
    const params = new URLSearchParams();
    if (filters?.identifier) params.append("identifier", filters.identifier);
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.append("dateTo", filters.dateTo);
    if (filters?.status) params.append("status", filters.status);

    const response = await fetch(
      `${API_BASE_URL}/trucks/export/excel?${params}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Failed to export");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trucks-${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const trucksApiClient = new TrucksApiClient();
