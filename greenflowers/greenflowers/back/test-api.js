const API_URL = "http://localhost:5000/api";

async function testLogin() {
  console.log("\n📝 Тестирование логина...");
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "test123",
      }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.ok && data.token) {
      console.log(
        "✅ Логин успешен! Token:",
        data.token.substring(0, 30) + "...",
      );
    }
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  }
}

async function testRegister() {
  console.log("\n📝 Тестирование регистрации...");
  try {
    const response = await fetch(`${API_URL}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "newuser" + Date.now() + "@example.com",
        password: "password123",
        name: "New User",
        phone: "9876543210",
        city: "Almaty",
        company_name: "My Company",
      }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.status === 201) {
      console.log("✅ Регистрация успешна!");
    }
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  }
}

async function runTests() {
  console.log("🚀 Начинаем тестирование API...");
  await testLogin();
  await testRegister();
  console.log("\n✨ Тестирование завершено!");
  process.exit(0);
}

runTests();
