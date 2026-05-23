function normalizePhone(phone) {
  if (phone == null || phone === "") return "";
  const s = typeof phone === "string" ? phone : String(phone);
  let digits = s.replace(/\D/g, "");
  if (digits.length === 10) digits = "7" + digits;
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  }
  return digits;
}

function tsToIso(t) {
  if (!t) return null;
  if (t.toDate) return t.toDate().toISOString();
  if (t instanceof Date) return t.toISOString();
  return null;
}

module.exports = { normalizePhone, tsToIso };
