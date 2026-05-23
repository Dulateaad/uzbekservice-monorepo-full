/**
 * Разрешения менеджера в Firestore (поле profiles.permissions).
 */

import { doc, getDoc, serverTimestamp, updateDoc, type Firestore } from "firebase/firestore";

export type ManagerPermissions = {
  create_product: boolean;
  create_batch: boolean;
  edit_truck: boolean;
  edit_position: boolean;
};

const DEFAULTS: ManagerPermissions = {
  create_product: true,
  create_batch: true,
  edit_truck: true,
  edit_position: true,
};

function mergePermissions(raw: unknown): ManagerPermissions {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  const p = raw as Record<string, unknown>;
  return {
    create_product: p.create_product !== false,
    create_batch: p.create_batch !== false,
    edit_truck: p.edit_truck !== false,
    edit_position: p.edit_position !== false,
  };
}

export async function getManagerPermissionsFirestore(
  db: Firestore,
  profileUid: string,
) {
  const snap = await getDoc(doc(db, "profiles", profileUid));
  if (!snap.exists()) {
    return { success: true, permissions: { ...DEFAULTS } };
  }
  const data = snap.data() as Record<string, unknown>;
  return { success: true, permissions: mergePermissions(data.permissions) };
}

export async function setManagerPermissionsFirestore(
  db: Firestore,
  profileUid: string,
  permissions: ManagerPermissions,
) {
  await updateDoc(doc(db, "profiles", profileUid), {
    permissions: {
      create_product: !!permissions.create_product,
      create_batch: !!permissions.create_batch,
      edit_truck: !!permissions.edit_truck,
      edit_position: !!permissions.edit_position,
    },
    updated_at: serverTimestamp(),
  });
  return { success: true };
}
