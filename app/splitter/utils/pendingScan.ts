/**
 * One-slot handoff for a receipt dropped on a page that has no scanner of its
 * own — the dashboard. A File can't ride in the URL, so the drop parks it here
 * and navigates to /splitter/new?scan=1, where the scan modal claims it on mount.
 */
let pending: { file: File; at: number } | null = null;

/**
 * The legitimate claim happens on the very next navigation, so anything older
 * is a handoff that never landed. Expiring it matters because the module lives
 * as long as the tab: without this, a drop whose navigation was interrupted
 * would sit in the slot and then auto-scan itself the next time the user opened
 * the scan modal by hand, minutes later and from a different bill.
 */
const MAX_AGE_MS = 10_000;

export function setPendingScan(file: File) {
  pending = { file, at: Date.now() };
}

/** Returns the parked file and empties the slot, so it is scanned at most once. */
export function takePendingScan(): File | null {
  const held = pending;
  pending = null;
  if (!held) return null;
  return Date.now() - held.at > MAX_AGE_MS ? null : held.file;
}
