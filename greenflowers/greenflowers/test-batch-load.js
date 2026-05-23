// Test script to check if frontend can load batches
(async () => {
  const API_URL = "http://localhost:5000/api";

  console.log("🔍 Testing batch loader from frontend...");

  try {
    const response = await fetch(`${API_URL}/catalog/batches?limit=2`);
    const data = await response.json();

    console.log("✓ API Response:", data);
    console.log("✓ Batches count:", data.batches?.length || 0);
    console.log("✓ First batch:", data.batches?.[0]);
  } catch (error) {
    console.error("❌ Error:", error);
  }
})();
