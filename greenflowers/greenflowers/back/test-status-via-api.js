const axios = require("axios");

const API_URL = "http://localhost:5000/api";

async function cleanTestStatus() {
  try {
    console.log(
      "🧪 ЧИСТЫЙ ТЕСТ: функция обновления статуса при pending → delivered\n",
    );

    // 1. Получаем заказы через API
    console.log("1️⃣  Получаем заказы для поиска тестового заказа...\n");

    try {
      console.log(`   Запрос к: ${API_URL}/orders/all?userId=1`);
      console.log(`   Timeout: 5000ms`);
      const allOrdersRes = await axios.get(`${API_URL}/orders/all?userId=1`, {
        timeout: 5000,
      });

      if (
        allOrdersRes.data &&
        Array.isArray(allOrdersRes.data) &&
        allOrdersRes.data.length > 0
      ) {
        console.log(`   ✅ Found ${allOrdersRes.data.length} total orders`);

        // Находим заказ с assigned_to = 1 и status = pending
        const testOrder = allOrdersRes.data.find(
          (o) => o.assigned_to === 1 && o.status === "pending",
        );

        if (testOrder) {
          const testOrderId = testOrder.id;
          console.log(`   ✅ Found test order ID: ${testOrderId}`);
          console.log(`   - assigned_to: ${testOrder.assigned_to}`);
          console.log(`   - status: ${testOrder.status}\n`);

          // 2. Администратор (userId=17) меняет статус на delivered
          console.log(
            "2️⃣  Администратор (ID 17) меняет статус: pending → delivered...\n",
          );

          const statusChangeRes = await axios.put(
            `${API_URL}/orders/${testOrderId}/status`,
            {
              userId: 17, // Admin ID
              status: "delivered",
            },
          );

          console.log(`   ✅ PUT запрос выполнен успешно`);
          console.log(`   API результат:`);
          console.log(
            `   - assigned_to: ${statusChangeRes.data?.order?.assigned_to}`,
          );
          console.log(
            `   - seller_id: ${statusChangeRes.data?.order?.seller_id}`,
          );
          console.log(`   - status: ${statusChangeRes.data?.order?.status}\n`);

          // 3. Проверяем данные через API повторно
          console.log(
            "3️⃣  Проверяем данные через API после изменения статуса...\n",
          );

          const checkRes = await axios.get(
            `${API_URL}/orders/${testOrderId}?userId=1`,
          );

          const updatedOrder = checkRes.data;
          console.log(`   Текущие данные в БД:`);
          console.log(
            `   - assigned_to: ${updatedOrder.assigned_to} (EXPECTED: 1)`,
          );
          console.log(
            `   - seller_id: ${updatedOrder.seller_id} (EXPECTED: 1)`,
          );
          console.log(
            `   - status: ${updatedOrder.status} (EXPECTED: delivered)\n`,
          );

          const result = {
            assigned_to_correct: updatedOrder.assigned_to === 1,
            seller_id_correct: updatedOrder.seller_id === 1,
            status_correct: updatedOrder.status === "delivered",
          };

          console.log("📊 РЕЗУЛЬТАТЫ:");
          console.log(
            `   assigned_to == 1: ${result.assigned_to_correct ? "✅" : "❌"}`,
          );
          console.log(
            `   seller_id == 1: ${result.seller_id_correct ? "✅" : "❌"}`,
          );
          console.log(
            `   status == delivered: ${result.status_correct ? "✅" : "❌"}`,
          );

          if (
            !result.assigned_to_correct ||
            !result.seller_id_correct ||
            !result.status_correct
          ) {
            console.log("\n❌ ОШИБКА: Не все условия выполнены!");
            console.log("\nПРОБЛЕМА:");
            if (!result.assigned_to_correct) {
              console.log(
                `  - assigned_to изменись с 1 на ${updatedOrder.assigned_to}!`,
              );
            }
            if (!result.seller_id_correct) {
              console.log(
                `  - seller_id = ${updatedOrder.seller_id}, но должен быть 1`,
              );
            }
          } else {
            console.log("\n✅ ТЕСТ ПРОЙДЕН: Все условия выполнены!");
          }
        } else {
          console.log("   ⚠️  No pending orders with assigned_to=1 found.");
          console.log(
            "   Available statuses: " +
              [...new Set(allOrdersRes.data.map((o) => o.status))].join(", "),
          );
          console.log(
            "   Available assigned_to values: " +
              [...new Set(allOrdersRes.data.map((o) => o.assigned_to))].join(
                ", ",
              ),
          );
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.code === "ECONNREFUSED") {
        console.log(`   Backend не запущен на ${API_URL}`);
      }
      if (error.response?.data) {
        console.log(`   Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response?.data) {
      console.error("Response:", error.response.data);
    }
  }
}

cleanTestStatus();
