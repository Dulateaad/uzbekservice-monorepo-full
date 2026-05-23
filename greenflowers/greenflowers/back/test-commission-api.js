const http = require("http");

function testCommissionAPI() {
  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/commissions/commission/all?role=admin",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const req = http.request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const jsonData = JSON.parse(data);
        console.log("Комиссии API ответ:");
        console.log(JSON.stringify(jsonData, null, 2));
      } catch (error) {
        console.error("Ошибка парсинга JSON:", error);
        console.log("Сырой ответ:", data);
      }
    });
  });

  req.on("error", (error) => {
    console.error("Ошибка запроса:", error);
  });

  req.end();
}

testCommissionAPI();
