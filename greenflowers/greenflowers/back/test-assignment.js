const BASE_URL = "http://localhost:5000/api";

// Test users (created earlier)
const USER1_ID = 15; // test@example.com
const USER2_ID = 18; // worker2@sprayflowers.kz
const ADMIN_ID = 1; // admin

let testOrderId = null;

async function makeRequest(method, endpoint, body = null) {
  const url = BASE_URL + endpoint;

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`[${method}] ${url}`);
    const response = await fetch(url, options);
    const text = await response.text();
    let bodyParsed;
    try {
      bodyParsed = JSON.parse(text);
    } catch {
      bodyParsed = text;
    }
    return { status: response.status, body: bodyParsed };
  } catch (error) {
    console.error(`❌ Request error for ${method} ${endpoint}:`, error.message);
    throw error;
  }
}

async function runTests() {
  console.log(
    "========== ТЕСТИРОВАНИЕ СИСТЕМЫ НАЗНАЧЕНИЯ ЗАКАЗОВ ==========\n",
  );

  try {
    // Тест 1: Создание заказа
    console.log("📦 Тест 1: Создание заказа со статусом 'pending'");
    const createRes = await makeRequest("POST", "/orders", {
      customer_name: "Test Customer",
      customer_phone: "+1234567890",
      customer_email: "test@customer.com",
      delivery_city: "Almaty",
      delivery_address: "Test St, 123",
      delivery_date: new Date().toISOString(),
      total_amount: 5000,
      status: "pending",
      items: [
        { product_id: 999999, quantity: 2, unit_price: 100 }, // Тестовое значение
      ],
    });
    console.log(`Status: ${createRes.status}`);
    if (createRes.body.success) {
      testOrderId = createRes.body.order.id;
      console.log(
        `✅ Заказ создан: ID ${testOrderId}, статус: ${createRes.body.order.status}`,
      );
      console.log(
        `   assigned_to: ${createRes.body.order.assigned_to || "NULL"}\n`,
      );
    } else {
      throw new Error("Не удалось создать заказ: " + createRes.body.error);
    }

    // Тест 2: User1 видит заказ со статусом 'new'
    console.log("👁️ Тест 2: User1 видит заказ со статусом 'pending'");
    const user1AllRes = await makeRequest(
      "GET",
      `/orders/all?userId=${USER1_ID}`,
    );
    console.log(`Status: ${user1AllRes.status}`);
    const user1Orders = user1AllRes.body.orders || [];
    const user1SeesOrder = user1Orders.some((o) => o.id === testOrderId);
    console.log(
      `✅ User1 видит заказ в списке: ${user1SeesOrder} (всего заказов: ${user1Orders.length})\n`,
    );

    // Тест 3: User2 видит заказ со статусом 'new'
    console.log("👁️ Тест 3: User2 видит заказ со статусом 'pending'");
    const user2AllRes = await makeRequest(
      "GET",
      `/orders/all?userId=${USER2_ID}`,
    );
    console.log(`Status: ${user2AllRes.status}`);
    const user2Orders = user2AllRes.body.orders || [];
    const user2SeesOrder = user2Orders.some((o) => o.id === testOrderId);
    console.log(
      `✅ User2 видит заказ в списке: ${user2SeesOrder} (всего заказов: ${user2Orders.length})\n`,
    );

    // Тест 4: User1 берёт заказ (атомарное назначение)
    console.log("🤝 Тест 4: User1 берёт заказ через POST /:orderId/take");
    const user1TakeRes = await makeRequest(
      "POST",
      `/orders/${testOrderId}/take`,
      {
        userId: USER1_ID,
      },
    );
    console.log(`Status: ${user1TakeRes.status}`);
    if (user1TakeRes.status === 200) {
      console.log(`✅ User1 успешно взял заказ`);
      console.log(`   assigned_to: ${user1TakeRes.body.order?.assigned_to}\n`);
    } else {
      console.log(`❌ Ошибка: ${user1TakeRes.body.error}\n`);
    }

    // Тест 5: User2 пытается также взять назначенный заказ
    console.log("❌ Тест 5: User2 пытается взять уже назначённый заказ");
    const user2TakeRes = await makeRequest(
      "POST",
      `/orders/${testOrderId}/take`,
      {
        userId: USER2_ID,
      },
    );
    console.log(`Status: ${user2TakeRes.status}`);
    console.log(
      `Ошибка: ${user2TakeRes.body.error || "no error"} ${user2TakeRes.status === 403 ? "✅" : "❌"}\n`,
    );

    // Тест 6: User1 меняет статус заказа (должно работать)
    console.log("📝 Тест 6: User1 меняет статус на 'processing'");
    const user1StatusRes = await makeRequest(
      "PUT",
      `/orders/${testOrderId}/status`,
      {
        userId: USER1_ID,
        status: "processing",
      },
    );
    console.log(`Status: ${user1StatusRes.status}`);
    if (user1StatusRes.status === 200) {
      console.log(
        `✅ User1 изменил статус на: ${user1StatusRes.body.order?.status}\n`,
      );
    } else {
      console.log(`❌ Ошибка: ${user1StatusRes.body.error}\n`);
    }

    // Тест 7: User2 пытается изменить статус заказа User1 (должно быть запрещено)
    console.log("❌ Тест 7: User2 пытается изменить статус заказа User1");
    const user2StatusRes = await makeRequest(
      "PUT",
      `/orders/${testOrderId}/status`,
      {
        userId: USER2_ID,
        status: "shipped",
      },
    );
    console.log(`Status: ${user2StatusRes.status}`);
    console.log(
      `Ошибка: ${user2StatusRes.body.error || "no error"} ${user2StatusRes.status === 403 ? "✅" : "❌"}\n`,
    );

    // Тест 8: User1 видит заказ в своём списке
    console.log("👁️ Тест 8: User1 видит свой назначённый заказ");
    const user1CheckRes = await makeRequest(
      "GET",
      `/orders/all?userId=${USER1_ID}`,
    );
    const user1CheckOrders = user1CheckRes.body.orders || [];
    const user1StillSeesOrder = user1CheckOrders.some(
      (o) => o.id === testOrderId,
    );
    console.log(
      `✅ User1 видит заказ в списке: ${user1StillSeesOrder} (всего заказов: ${user1CheckOrders.length})\n`,
    );

    // Тест 9: User2 НЕ видит назначённый заказ
    console.log("👁️ Тест 9: User2 НЕ видит заказ, назначённый User1");
    const user2CheckRes = await makeRequest(
      "GET",
      `/orders/all?userId=${USER2_ID}`,
    );
    const user2CheckOrders = user2CheckRes.body.orders || [];
    const user2DoesNotSeeOrder = !user2CheckOrders.some(
      (o) => o.id === testOrderId,
    );
    console.log(
      `✅ User2 НЕ видит заказ: ${user2DoesNotSeeOrder} (всего заказов: ${user2CheckOrders.length})\n`,
    );

    // Тест 10: АДМИН видит ВСЕ заказы (включая назначённые)
    console.log("👁️ Тест 10: АДМИН видит все заказы без ограничений");
    const adminAllRes = await makeRequest(
      "GET",
      `/orders/all?userId=${ADMIN_ID}`,
    );
    const adminOrders = adminAllRes.body.orders || [];
    const adminSeesOrder = adminOrders.some((o) => o.id === testOrderId);
    console.log(
      `✅ АДМИН видит заказ: ${adminSeesOrder} (всего заказов: ${adminOrders.length})\n`,
    );

    // Summary
    console.log("========== ИТОГИ ТЕСТИРОВАНИЯ ==========");
    const testResults = [
      ["✅ Заказ создан со статусом 'pending'", true],
      ["✅ User1 видит новый заказ", user1SeesOrder],
      ["✅ User2 видит новый заказ", user2SeesOrder],
      ["✅ User1 может взять заказ", user1TakeRes.status === 200],
      ["✅ User2 НЕ может взять чужой заказ", user2TakeRes.status === 403],
      ["✅ User1 может менять статус", user1StatusRes.status === 200],
      [
        "✅ User2 НЕ может менять статус чужого заказа",
        user2StatusRes.status === 403,
      ],
      ["✅ User1 видит свой заказ", user1StillSeesOrder],
      ["✅ User2 НЕ видит чужой заказ", user2DoesNotSeeOrder],
      ["✅ АДМИН видит все заказы", adminSeesOrder],
    ];

    testResults.forEach(([name, passed]) => {
      console.log(`${passed ? "✅" : "❌"} ${name}`);
    });

    const allPassed = testResults.every((r) => r[1]);
    console.log(
      `\n${allPassed ? "🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!" : "⚠️ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛИЛИСЬ"}`,
    );
  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error.message);
  }
}

runTests();
