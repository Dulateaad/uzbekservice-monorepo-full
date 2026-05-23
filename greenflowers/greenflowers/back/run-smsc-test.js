const { execSync } = require("child_process");
const fs = require("fs");

try {
  console.log("🚀 Running SMSC.KZ integration test...\n");

  const result = execSync("node test-smsc.js", {
    cwd: __dirname,
    encoding: "utf8",
    stdio: "pipe",
  });

  console.log(result);
} catch (error) {
  console.log("Test output:");
  console.log(error.stdout || "");
  console.log("\nErrors:");
  console.log(error.stderr || error.message);
  process.exit(0);
}
