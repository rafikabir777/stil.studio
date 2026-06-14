import { Pin } from "../types";

const PIN_DB_NAME = "pixelpulse_local";
const PIN_DB_VERSION = 1;
const PIN_STORE_NAME = "pins";

function openPinDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(PIN_DB_NAME, PIN_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PIN_STORE_NAME)) {
        db.createObjectStore(PIN_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPersistedPins(): Promise<Pin[]> {
  const db = await openPinDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PIN_STORE_NAME, "readonly");
    const store = transaction.objectStore(PIN_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as Pin[]);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function persistPins(pins: Pin[]): Promise<void> {
  const db = await openPinDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PIN_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PIN_STORE_NAME);

    pins.forEach((pin) => {
      store.put(pin);
    });

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}
