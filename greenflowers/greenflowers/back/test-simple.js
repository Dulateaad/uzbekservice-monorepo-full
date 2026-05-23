const BASE_URL = "http://localhost:5000/api";

// Test users (created earlier)
const USER1_ID = 15; // test@example.com
const USER2_ID = 18; // worker2@sprayflowers.kz
const ADMIN_ID = 1; // admin

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
    console.error(`Request error for ${method} ${endpoint}:`, error.message);
    throw error;
  }
}

async function runTests() {
  console.log(
    "========== ТЕСТИРОВАНИЕ СИСТЕМЫ НАЗНАЧЕНИЯ ЗАКАЗОВ ==========\n",
  );

  try {
    // Сначала получим список существующих заказов
    console.log("📋 Получение существующих заказов...");
    const allOrdersRes = await makeRequest(
      "GET",
      `/orders/all?userId=${ADMIN_ID}`,
    );
    const allOrders = allOrdersRes.body.orders || [];

    if (allOrders.length === 0) {
      console.log("❌ Нет заказов в системе. Невозможно протестировать.");
      return;
    }

    console.log(`✅ Найдено ${allOrders.length} заказов\n`);

    // Используем первый заказ для тестирования
    const testOrderId = allOrders[0].id;
    console.log(`🔧 Используем заказ ID: ${testOrderId}\n`);

    // Тест 2: User1 видит заказ
    console.log("👁️ Тест 1: User1 видит заказ");
    const user1AllRes = await makeRequest(
      "GET",
      `/orders/all?userId=${USER1_ID}`,
    );
    const user1Orders = user1AllRes.body.orders || [];
    const user1SeesOrder = user1Orders.some((o) => o.id === testOrderId);
    console.log(
      `Status: ${user1AllRes.status}, Видит заказ: ${user1SeesOrder}\n`,
    );

    // Тест 3: User2 видит заказ
    console.log("👁️ Тест 2: User2 видит заказ");
    const user2AllRes = await makeRequest(
      "GET",
      `/orders/all?userId=${USER2_ID}`,
    );
    const user2Orders = user2AllRes.body.orders || [];
    const user2SeesOrder = user2Orders.some((o) => o.id === testOrderId);
    console.log(
      `Status: ${user2AllRes.status}, Видит заказ: ${user2SeesOrder}\n`,
    );

    // Тест 4: User1 берёт заказ (атомарное назначение)
    console.log("🤝 Тест 3: User1 берёт заказ через POST /:orderId/take");
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

    // Тест 5: User2 пытается взять назначенный заказ
    console.log("❌ Тест 4: User2 пытается взять уже назначённый заказ");
    const user2TakeRes = await makeRequest(
      "POST",
      `/orders/${testOrderId}/take`,
      {
        userId: USER2_ID,
      },
    );
    console.log(`Status: ${user2TakeRes.status}`);
    console.log(`Ошибка: ${user2TakeRes.body.error || "no error"}\n`);

    // Тест 6: User1 видит заказ в своём списке
    console.log("👁️ Тест 5: User1 видит свой назначённый заказ");
    const user1CheckRes = await makeRequest(
      "GET",
      `/orders/all?userId=${USER1_ID}`,
    );
    const user1CheckOrders = user1CheckRes.body.orders || [];
    const user1StillSeesOrder = user1CheckOrders.some(
      (o) => o.id === testOrderId,
    );
    console.log(
      `Видит заказ: ${user1StillSeesOrder} (всего заказов: ${user1CheckOrders.length})\n`,
    );

    // Тест 7: User2 НЕ видит назначённый заказ
    console.log("👁️ Тест 6: User2 НЕ видит заказ, назначённый User1");
    const user2CheckRes = await makeRequest(
      "GET",
      `/orders/all?userId=${USER2_ID}`,
    );
    const user2CheckOrders = user2CheckRes.body.orders || [];
    const user2DoesNotSeeOrder = !user2CheckOrders.some(
      (o) => o.id === testOrderId,
    );
    console.log(
      `НЕ видит заказ: ${user2DoesNotSeeOrder} (всего заказов: ${user2CheckOrders.length})\n`,
    );

    // Тест 8: АДМИН видит ВСЕ заказы (включая назначённые)
    console.log("👁️ Тест 7: АДМИН видит все заказы без ограничений");
    const adminAllRes = await makeRequest(
      "GET",
      `/orders/all?userId=${ADMIN_ID}`,
    );
    const adminOrders = adminAllRes.body.orders || [];
    const adminSeesOrder = adminOrders.some((o) => o.id === testOrderId);
    console.log(
      `Видит заказ: ${adminSeesOrder} (всего заказов: ${adminOrders.length})\n`,
    );

    // Summary
    console.log("========== ИТОГИ ТЕСТИРОВАНИЯ ==========");
    const testResults = [
      ["✅ User1 видит заказ до назначения", user1SeesOrder],
      ["✅ User2 видит заказ до назначения", user2SeesOrder],
      ["✅ User1 может взять заказ", user1TakeRes.status === 200],
      ["✅ User2 НЕ может взять чужой заказ", user2TakeRes.status === 403],
      ["✅ User1 видит свой назначённый заказ", user1StillSeesOrder],
      ["✅ User2 НЕ видит чужой назначённый заказ", user2DoesNotSeeOrder],
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
