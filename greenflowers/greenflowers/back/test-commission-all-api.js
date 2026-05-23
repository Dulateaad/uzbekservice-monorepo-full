const http = require("http");

function testCommissionAllCitiesAPI() {
  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/commissions/commission/truck/6decfe72-b3c7-4535-84c4-d82909245e57/ALL",
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
        console.log("Комиссии ALL города API ответ:");
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

testCommissionAllCitiesAPI();
