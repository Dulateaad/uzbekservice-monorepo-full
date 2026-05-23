const fs = require("fs");

// Read the original log file with utf16le encoding
const originalData = fs.readFileSync("smsc_result.log", "utf16le");

// Write it as UTF-8 to a new file
fs.writeFileSync("smsc_result_utf8.txt", originalData, "utf8");

console.log("File converted and output:");
console.log(originalData);
process.exit(0);
