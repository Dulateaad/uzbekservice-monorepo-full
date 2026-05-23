const axios = require("axios").default;

async function test() {
  try {
    const resp = await axios.get("http://localhost:5000/api/trucks");
    console.log("Response status:", resp.status);
    console.log("Response data:", JSON.stringify(resp.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    }
  }
}

test();
