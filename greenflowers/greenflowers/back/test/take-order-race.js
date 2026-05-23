const axios = require("axios");

const API_BASE = process.env.API_BASE || "http://localhost:3000";

async function createOrder() {
  const payload = {
    customer_name: "Тест",
    customer_phone: "+70000000000",
    delivery_city: "Тестоград",
    delivery_address: "ул. Тестовая, 1",
    total_amount: 1000,
  };
  const r = await axios.post(`${API_BASE}/orders`, payload).catch((e) => {
    console.error(
      "Create order error",
      e.response ? e.response.data : e.message,
    );
    throw e;
  });
  return r.data && r.data.order ? r.data.order : r.data;
}

async function takeAttempt(orderId, userId) {
  try {
    const r = await axios.post(`${API_BASE}/orders/${orderId}/take`, {
      userId,
    });
    return { ok: true, data: r.data };
  } catch (e) {
    return {
      ok: false,
      status: e.response ? e.response.status : null,
      data: e.response ? e.response.data : e.message,
    };
  }
}

async function main() {
  console.log("Создаём заказ...");
  const order = await createOrder();
  console.log("Order created:", order.id);

  const userA = 1001; // замените на реальные ID пользователей в вашей БД
  const userB = 1002;

  console.log("Параллельные попытки взятия заказа двумя пользователями...");

  const [r1, r2] = await Promise.all([
    takeAttempt(order.id, userA),
    takeAttempt(order.id, userB),
  ]);

  console.log("Результат попытки userA:", r1);
  console.log("Результат попытки userB:", r2);

  // Получаем текущий заказ
  const final = await axios
    .get(`${API_BASE}/orders/${order.id}`)
    .catch((e) => ({ error: e.response ? e.response.data : e.message }));
  console.log("Текущее состояние заказа:", final.data || final);
}

main().catch((e) => {
  console.error("Error during test:", e);
  process.exit(1);
});
