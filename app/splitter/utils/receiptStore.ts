/**
 * Stores the scanned receipt image for a bill, so it can be shown alongside the
 * parsed items for cross-checking.
 *
 * IndexedDB rather than localStorage: images have to be base64'd to fit in
 * localStorage, which inflates them by a third, and bills live there under a
 * single key that is rewritten whole on every save. A receipt pushing that over
 * quota wouldn't just lose the image — it would fail the write and silently
 * stop persisting the bill list. A separate store can't take the bills down
 * with it, and holds Blobs natively.
 *
 * Every failure here is swallowed: the image is a convenience, and losing it
 * must never interfere with splitting the bill.
 */

const DB_NAME = "splitter";
const DB_VERSION = 1;
const STORE = "receipts";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      // Firefox throws here rather than erroring in private browsing.
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const tx = db.transaction(STORE, mode);
          const request = action(tx.objectStore(STORE));
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => resolve(null);
          tx.oncomplete = () => db.close();
          tx.onabort = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      }),
  );
}

export function saveReceipt(billId: string, image: Blob): Promise<unknown> {
  return run("readwrite", (store) => store.put(image, billId));
}

export function getReceipt(billId: string): Promise<Blob | null> {
  return run<Blob>("readonly", (store) => store.get(billId));
}

export function deleteReceipt(billId: string): Promise<unknown> {
  return run("readwrite", (store) => store.delete(billId));
}

/** Drops every stored receipt — used when the user clears their local data. */
export function clearReceipts(): Promise<unknown> {
  return run("readwrite", (store) => store.clear());
}
