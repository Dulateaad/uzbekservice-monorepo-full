import type { Timestamp } from "firebase/firestore";

export function tsToIso(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "object" && v !== null && "toDate" in v) {
    return (v as Timestamp).toDate().toISOString();
  }
  if (v instanceof Date) return v.toISOString();
  return null;
}
