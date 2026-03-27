const crypto = require("crypto");
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

 function generateId() {
  const bytes = crypto.randomBytes(10);
  let result = "";
  for (let i = 0; i < 10; i++) result += alphabet[bytes[i] & 31];
  return `${result.slice(0,4)}-${result.slice(4,8)}-${result.slice(8,10)}`;
}

module.exports = generateId;