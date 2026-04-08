import { db, FieldValue } from "./config/firebase";

/**
 * Expire SEARCHING/BIDDING trips older than 10 minutes.
 * Called by the scheduled Cloud Function every 2 minutes.
 */
export async function expireStaleTrips(): Promise<number> {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);

  const staleSnap = await db
    .collection("trips")
    .where("status", "in", ["SEARCHING", "BIDDING"])
    .where("createdAt", "<", tenMinAgo)
    .limit(50)
    .get();

  if (staleSnap.empty) return 0;

  const batch = db.batch();
  staleSnap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "NO_DRIVER",
      updatedAt: FieldValue.serverTimestamp(),
      expiredAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  console.log(`Expired ${staleSnap.size} stale trips`);
  return staleSnap.size;
}
