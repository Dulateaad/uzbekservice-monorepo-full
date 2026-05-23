const fs = require("fs");

const data = fs.readFileSync("smsc_result.log", "utf16le");
console.log(data);
