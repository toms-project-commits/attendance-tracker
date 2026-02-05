/**
 * Local Proof Storage Utility
 * Stores attendance proofs in browser IndexedDB or device filesystem
 * avoiding Supabase storage limitations
 */

const DB_NAME = 'BunkSafeProofs';
const DB_VERSION = 1;
const STORE_NAME = 'proofs';

interface ProofMetadata {
  id: string; // Format: {userId}_{date}_{subjectId}
  userId: string;
  date: string;
  subjectId: string;
  timestamp: number;
  dataUrl: string; // Base64 encoded image
}

/**
 * Initialize IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('userId', 'userId', { unique: false });
        objectStore.createIndex('date', 'date', { unique: false });
      }
    };
  });
}

/**
 * Save proof to local storage
 */
export async function saveProofLocally(
  userId: string,
  date: string,
  subjectId: string,
  imageFile: File
): Promise<string> {
  try {
    // Convert file to base64 data URL
    const dataUrl = await fileToDataUrl(imageFile);

    const proofId = `${userId}_${date}_${subjectId}_${Date.now()}`;
    const proof: ProofMetadata = {
      id: proofId,
      userId,
      date,
      subjectId,
      timestamp: Date.now(),
      dataUrl,
    };

    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = objectStore.add(proof);
      request.onsuccess = () => resolve(proofId);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving proof locally:', error);
    throw new Error('Failed to save proof to local storage');
  }
}

/**
 * Get proof from local storage
 */
export async function getProofLocally(proofId: string): Promise<string | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = objectStore.get(proofId);
      request.onsuccess = () => {
        const proof = request.result as ProofMetadata | undefined;
        resolve(proof?.dataUrl || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting proof locally:', error);
    return null;
  }
}

/**
 * Delete proof from local storage
 */
export async function deleteProofLocally(proofId: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = objectStore.delete(proofId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting proof locally:', error);
    throw new Error('Failed to delete proof');
  }
}

/**
 * Get all proofs for a user and date
 */
export async function getProofsForDate(
  userId: string,
  date: string
): Promise<ProofMetadata[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = objectStore.getAll();
      request.onsuccess = () => {
        const allProofs = request.result as ProofMetadata[];
        const filtered = allProofs.filter(
          (p) => p.userId === userId && p.date === date
        );
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting proofs for date:', error);
    return [];
  }
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  totalProofs: number;
  estimatedSize: string;
}> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const request = objectStore.getAll();
      request.onsuccess = () => {
        const allProofs = request.result as ProofMetadata[];
        const totalSize = allProofs.reduce((sum, proof) => {
          return sum + (proof.dataUrl?.length || 0);
        }, 0);

        // Rough estimate: base64 is ~33% larger than original
        const sizeInMB = (totalSize * 0.75) / (1024 * 1024);

        resolve({
          totalProofs: allProofs.length,
          estimatedSize: `${sizeInMB.toFixed(2)} MB`,
        });
      };
      request.onerror = () => resolve({ totalProofs: 0, estimatedSize: '0 MB' });
    });
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { totalProofs: 0, estimatedSize: '0 MB' };
  }
}

/**
 * Clear all proofs (use with caution)
 */
export async function clearAllProofs(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = objectStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing proofs:', error);
    throw new Error('Failed to clear proofs');
  }
}

/**
 * Helper: Convert File to Data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
