/** Счётчики числовых id для совместимости с фронтом (PostgreSQL serial). */

async function nextId(db, name) {
  const ref = db.collection("meta").doc("counters");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const key = `next_${name}`;
    const raw = Number(data[key]);
    const cur = Number.isFinite(raw) && raw >= 0 ? raw : 0;
    const next = cur + 1;
    if (!Number.isFinite(next) || next < 1) {
      throw new Error(`Invalid counter ${name}`);
    }
    tx.set(ref, { [key]: next, updatedAt: new Date() }, { merge: true });
    return next;
  });
}

module.exports = { nextId };
