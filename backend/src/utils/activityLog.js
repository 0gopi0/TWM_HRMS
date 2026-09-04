import { getStore } from "../store/index.js";

// Resolves the acting user to a stable {employeeId, name} pair for the
// activity log, captured once at write time — so a historical entry keeps
// reading correctly (name and all) even if the person is later renamed or
// removed, instead of re-deriving it from live data on every read.
export async function resolveActor(user) {
  if (!user) return { employeeId: null, name: "System" };
  const store = getStore();
  const emp = await store.getEmployeeByUserId(user.id);
  return { employeeId: emp?.id ?? null, name: emp?.legalName || user.email || user.id };
}
