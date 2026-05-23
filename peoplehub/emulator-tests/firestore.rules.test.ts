/**
 * Firestore security rules: `firebase emulators:exec` + vitest.
 * Нужен JDK **11+** (Firestore Emulator; Java 8 не подходит).
 * Запуск: из `peoplehub/` — `npm run test:firestore-rules`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, setLogLevel, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rulesPath = join(__dirname, "..", "firestore.rules");

describe("PeopleHub Firestore rules", () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    setLogLevel("silent");
    env = await initializeTestEnvironment({
      projectId: "demo-peoplehub",
      firestore: {
        rules: readFileSync(rulesPath, "utf8"),
      },
    });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("разрешает create/read на trips", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, "trips/trip_rules_1"), { status: "SEARCHING" }));
    await assertSucceeds(getDoc(doc(db, "trips/trip_rules_1")));
  });

  it("разрешает create сообщения, запрещает update", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(doc(db, "trips/t_msg_1/messages/m1"), { text: "a", createdAt: 1 }),
    );
    await assertFails(updateDoc(doc(db, "trips/t_msg_1/messages/m1"), { text: "b" }));
  });

  it("запрещает read на произвольной коллекции (fallback deny)", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "unknown_collection/doc1")));
  });

  it("config — только read", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "config/flags")));
    await assertFails(setDoc(doc(db, "config/flags"), { x: 1 }));
  });

  it("ratings — create разрешён, update запрещён", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(doc(db, "ratings/r1"), { fromUser: "a", toUser: "b", value: 5, tripId: "t" }),
    );
    await assertFails(updateDoc(doc(db, "ratings/r1"), { value: 1 }));
  });

  it("subscriptions — create разрешён, update запрещён", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(doc(db, "subscriptions/sub1"), { userId: "u", productId: "p", until: 1 }),
    );
    await assertFails(updateDoc(doc(db, "subscriptions/sub1"), { until: 2 }));
  });

  it("users и driverLocations — read/write", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, "users/tg_1"), { name: "x" }));
    await assertSucceeds(getDoc(doc(db, "users/tg_1")));
    await assertSucceeds(
      setDoc(doc(db, "driverLocations/d1"), { lat: 1, lng: 1, online: true, updatedAt: 1 }),
    );
  });
});
