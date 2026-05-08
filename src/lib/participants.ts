import { supabase } from "./supabase";

// ─── Participant model ─────────────────────────────────────────────────────────

export interface Participant {
  id: string;
  trip_id: string;
  name: string;
  joined_at: string; // ISO
}

// ─── Local identity (only the ID is kept client-side) ─────────────────────────

const MY_ID_PREFIX = "fk_my_participant_id_";

function myIdKey(tripId: string | number) {
  return MY_ID_PREFIX + tripId;
}

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getMyParticipantId(tripId: string | number): string | null {
  try { return localStorage.getItem(myIdKey(tripId)); } catch { return null; }
}

function setMyParticipantId(tripId: string | number, id: string) {
  try { localStorage.setItem(myIdKey(tripId), id); } catch { /* noop */ }
}

function clearMyParticipantId(tripId: string | number) {
  try { localStorage.removeItem(myIdKey(tripId)); } catch { /* noop */ }
}

/** True if this device has previously joined (based on locally stored ID). */
export function hasJoinedLocally(tripId: string | number): boolean {
  return !!getMyParticipantId(tripId);
}

// ─── Supabase CRUD ────────────────────────────────────────────────────────────

export async function getParticipants(tripId: string | number): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("trip_id", String(tripId))
    .order("joined_at", { ascending: true });

  if (error) console.error("getParticipants:", error.message);
  return (data ?? []) as Participant[];
}

export async function addParticipant(
  tripId: string | number,
  name: string,
): Promise<Participant> {
  const id = randomId();
  const row: Participant = {
    id,
    trip_id: String(tripId),
    name: name.trim(),
    joined_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("participants").insert(row);
  if (error) throw new Error(error.message);

  setMyParticipantId(tripId, id);
  return row;
}

export async function leaveTrip(tripId: string | number): Promise<void> {
  const myId = getMyParticipantId(tripId);
  if (!myId) return;

  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("id", myId);

  if (error) console.error("leaveTrip:", error.message);
  clearMyParticipantId(tripId);
}
