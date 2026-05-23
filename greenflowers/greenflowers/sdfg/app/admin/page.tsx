import { redirect } from "next/navigation";

/** Обзор ведёт на заказы — отдельной страницы /admin нет. */
export default function AdminPage() {
  redirect("/admin/orders");
}
