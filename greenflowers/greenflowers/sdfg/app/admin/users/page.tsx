"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import UserModal from "@/components/users/UserModal";
import BottomStats from "@/components/clients/BottomStats";

export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    balance: 0,
    totalOrders: 0,
    profit: 0,
  });

  const load = async (opts = {}) => {
    setLoading(true);
    try {
      if (!user) {
        setClients([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      // Use appropriate endpoint based on user role
      const res: any =
        user.role === "admin"
          ? await api.getAllUsers(user.id)
          : await api.getWorkerUsers(user.id);
      // defensive parsing of response; some failed calls returned
      // an empty object which triggered the "Error response: {}" log
      // even though there wasn't much information.  Ensure we only
      // treat the call as successful if we actually received an array
      // of users.
      const rows = Array.isArray(res?.users)
        ? res.users
        : Array.isArray(res)
          ? res
          : null;

      if (res && res.success !== false && rows !== null) {
        setClients(rows);
        setTotal(rows.length);
        setStats({
          total: rows.length,
          balance: 0,
          totalOrders: 0,
          profit: 0,
        });
      } else {
        // Some calls returned an empty object ({}). Treat that as
        // "no users" silently instead of logging an error for the
        // empty payload. Only surface/log when there's an explicit
        // error field. For unexpected shapes, log debug info but avoid
        // noisy error alerts.
        if (res && Object.keys(res).length === 0) {
          setClients([]);
          setTotal(0);
        } else if (res?.error) {
          console.error("[Users] Error response:", res);
          alert(res.error || "Ошибка при загрузке пользователей");
          setClients([]);
          setTotal(0);
        } else {
          console.debug("[Users] Unexpected response shape:", res);
          setClients([]);
          setTotal(0);
        }
      }
    } catch (e) {
      console.error("[Users] Exception:", e);
      alert("Ошибка при загрузке пользователей");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      load();
    } else if (!authLoading && !user) {
      setClients([]);
      setTotal(0);
      setLoading(false);
    }
  }, [user, page, authLoading]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => {
    if (user?.role !== "admin") return alert("Доступ запрещён");
    setEditing(null);
    setModalVisible(true);
  };
  const openEdit = (c: any) => {
    if (user?.role !== "admin") return alert("Доступ запрещён");
    setEditing(c);
    setModalVisible(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (!user) throw new Error("Войдите как администратор");
      if (user.role !== "admin") throw new Error("Доступ запрещён");
      if (editing && editing.id) {
        const res: any = await api.updateUser(
          user.id,
          editing.id,
          data,
          editing.profileUid,
        );
        if (res && res.success) {
          alert("Пользователь обновлён");
          setModalVisible(false);
          await load();
        } else
          throw new Error(res?.error || "Ошибка при обновлении пользователя");
      } else {
        const password = data.password?.trim() || "change_me123";
        const res: any = await api.adminCreateUserWithEmail({
          email: data.email,
          password,
          name: data.name,
          phone: data.phone,
          city: data.city,
          company_name: data.company_name,
          role: data.role ?? "user",
          is_active: data.is_active !== false,
        });
        if (res && res.success) {
          alert("Пользователь создан");
          setModalVisible(false);
          await load();
        } else
          throw new Error(res?.error || "Ошибка при создании пользователя");
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Ошибка при сохранении пользователя");
    }
  };

  const changeRole = async (u: any, newRole: string) => {
    if (!user) return;
    if (user.role !== "admin") return alert("Доступ запрещён");
    try {
      const resp: any = await api.updateUserRole(
        user.id,
        u.id,
        newRole,
        u.profileUid,
      );
      if (resp && resp.success) {
        setClients((prev) =>
          prev.map((it) =>
            (it.profileUid || it.id) === (u.profileUid || u.id)
              ? { ...it, role: newRole }
              : it,
          ),
        );
      } else {
        alert(resp?.error || "Ошибка при смене роли");
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Ошибка при смене роли");
    }
  };

  const handleDelete = async (c: any) => {
    if (!user) return alert("Войдите в систему");
    if (user.role !== "admin") return alert("Доступ запрещён");
    if (!confirm(`Удалить пользователя ${c.name || c.email}?`)) return;
    try {
      const res: any = await api.deleteUser(user.id, c.id, c.profileUid);
      if (res && res.success) {
        alert("Пользователь удалён");
        setClients((prev) =>
          prev.filter(
            (p) => (p.profileUid || p.id) !== (c.profileUid || c.id),
          ),
        );
      } else throw new Error(res?.error || "Ошибка при удалении");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Ошибка при удалении пользователя");
    }
  };

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((c: any) => {
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      return name.startsWith(q) || email.startsWith(q) || phone.startsWith(q);
    });
  }, [clients, search]);

  const pages = useMemo(
    () => Math.max(1, Math.ceil((total || clients.length) / limit)),
    [total, clients.length, limit],
  );

  return (
    <DashboardLayout title="Пользователи" requiredRole={["admin", "worker"]}>
      <div className="mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg
                className="absolute left-3 top-3 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <Input
                placeholder="Поиск по имени, email, телефону"
                value={search}
                onChange={(e: any) => setSearch(e.target.value)}
                className="pl-10 rounded-lg border-gray-300"
              />
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="bg-[#568a56] hover:bg-[#467044] text-white"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Добавить пользователя
          </Button>
        </div>
      </div>

      {authLoading || loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#568a56] border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">
            {authLoading ? "Инициализация..." : "Загрузка пользователей..."}
          </p>
        </div>
      ) : search.trim() !== "" && filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-500 font-medium">Ничего не найдено</p>
          <p className="text-gray-400 text-sm mt-1">
            Попробуйте другой поисковый запрос
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Имя
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Телефон
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Роль
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Статус
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Дата создания
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map((c) => (
                <tr
                  key={c.profileUid || `u-${c.id}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {c.name || c.email}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{c.email}</td>
                  <td className="px-6 py-4 text-gray-600">{c.phone ?? "-"}</td>
                  <td className="px-6 py-4">
                    <select
                      value={c.role || "user"}
                      onChange={(e) => changeRole(c, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="user">Пользователь</option>
                      <option value="worker">Рабочий</option>
                      <option value="admin">Админ</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${c.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"}`}
                    >
                      {c.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {c.created_at
                      ? new Date(c.created_at).toLocaleDateString("ru-RU")
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Всего:{" "}
          <span className="font-semibold text-gray-900">
            {total || clients.length}
          </span>{" "}
          пользователей
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (page > 1) setPage(page - 1);
            }}
            disabled={page <= 1}
            className="disabled:opacity-50"
          >
            ← Назад
          </Button>
          <span className="text-sm text-gray-600 px-3">
            Страница {page} из {pages}
          </span>
          <Button
            onClick={() => {
              if (page < pages) setPage(page + 1);
            }}
            disabled={page >= pages}
            className="disabled:opacity-50"
          >
            Вперед →
          </Button>
        </div>
      </div>

      <UserModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        initial={editing}
      />
    </DashboardLayout>
  );
}
