const BASE_URL = "http://localhost:5000/api";

async function checkUsers() {
  const users = [1, 15, 18];

  for (const userId of users) {
    const response = await fetch(`${BASE_URL}/users/${userId}`)
      .then((r) => r.json())
      .catch((e) => ({ error: e.message }));

    console.log(`User ${userId}:`, response);
  }
}

checkUsers();
