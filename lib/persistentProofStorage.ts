/**
 * Persistent Proof Storage using Capacitor Filesystem
 * Stores attendance proofs on device persistent storage
 * Works on both web (Browser) and native (Android/iOS)
 */

import { Filesystem, Directory } from '@capacitor/filesystem';

const PROOF_DIR = 'attendance-proofs';

interface ProofMetadata {
  id: string;
  userId: string;
  date: string;
  subjectId: string;
  subjectName: string;
  timestamp: number;
  filename: string;
}

/**
 * Initialize proof storage directory
 */
async function ensureDirectory(): Promise<void> {
  try {
    await Filesystem.mkdir({
      path: PROOF_DIR,
      directory: Directory.Data,
      recursive: true,
    });
    console.log('[PROOF] Proof directory ensured:', PROOF_DIR);
  } catch (error: any) {
    // Directory might already exist, that's fine - ignore these specific errors
    const errorMsg = error?.message?.toLowerCase() || '';
    const isAlreadyExistsError = 
      errorMsg.includes('exist') || 
      errorMsg.includes('already') ||
      errorMsg.includes('directory');
    
    if (isAlreadyExistsError) {
      console.log('[PROOF] Proof directory already exists (this is fine)');
    } else {
      console.error('[PROOF ERROR] Error creating directory:', error);
      throw new Error(`Failed to create storage directory: ${error.message}`);
    }
  }
}

/**
 * Save proof to persistent storage
 */
export async function saveProofPersistent(
  userId: string,
  date: string,
  subjectId: string,
  subjectName: string,
  imageFile: File,
  startTime?: string
): Promise<string> {
  console.log('[PROOF] Starting proof save...', { userId, date, subjectId, subjectName, startTime, fileSize: imageFile.size });
  
  try {
    // Step 1: Ensure directory exists
    console.log('[PROOF] Step 1: Ensuring directory exists...');
    await ensureDirectory();
    console.log('[PROOF] Directory ready');

    // Step 2: Delete existing proof for this exact class (if any)
    if (startTime) {
      console.log('[PROOF] Step 2a: Deleting old proof for this class if it exists...');
      try {
        await deleteProofPersistent(userId, date, subjectId, startTime);
        console.log('[PROOF] Old proof deleted (or none existed)');
      } catch (deleteError) {
        console.log('[PROOF] No old proof to delete or error deleting:', deleteError);
      }
    }

    // Step 3: Generate unique filename (include start_time to differentiate multiple classes)
    const timestamp = Date.now();
    const timeIdentifier = startTime ? `_${startTime.replace(':', '')}` : '';
    const filename = `${userId}_${date}_${subjectId}${timeIdentifier}_${timestamp}.webp`;
    const proofId = `proof_${timestamp}`;
    console.log('[PROOF] Step 3: Generated filename:', filename);

    // Step 3: Convert File to base64
    console.log('[PROOF] Step 3: Converting image to base64...');
    const base64Data = await fileToBase64(imageFile);
    console.log('[PROOF] Base64 conversion complete, length:', base64Data.length);

    // Step 4: Save image file
    console.log('[PROOF] Step 4: Writing image file to filesystem...');
    try {
      await Filesystem.writeFile({
        path: `${PROOF_DIR}/${filename}`,
        data: base64Data,
        directory: Directory.Data,
      });
      console.log('[PROOF] Image file saved successfully');
    } catch (writeError: any) {
      console.error('[PROOF ERROR] Failed to write image file:', writeError);
      throw new Error(`File write failed: ${writeError.message || 'Unknown error'}`);
    }

    // Step 5: Save metadata
    console.log('[PROOF] Step 5: Writing metadata file...');
    const metadata: ProofMetadata = {
      id: proofId,
      userId,
      date,
      subjectId,
      subjectName,
      timestamp,
      filename,
    };

    try {
      // Write metadata as plain text (not base64)
      const metadataJson = JSON.stringify(metadata);
      const metadataBase64 = btoa(metadataJson); // Convert to base64 for Capacitor
      
      await Filesystem.writeFile({
        path: `${PROOF_DIR}/${filename}.json`,
        data: metadataBase64,
        directory: Directory.Data,
      });
      console.log('[PROOF] Metadata saved successfully');
    } catch (metaError: any) {
      console.error('[PROOF ERROR] Failed to write metadata:', metaError);
      // Try to cleanup the image file
      try {
        await Filesystem.deleteFile({
          path: `${PROOF_DIR}/${filename}`,
          directory: Directory.Data,
        });
        console.log('[PROOF] Cleaned up orphaned image file');
      } catch (cleanupError) {
        console.error('[PROOF WARNING] Could not cleanup orphaned file:', cleanupError);
      }
      throw new Error(`Metadata write failed: ${metaError.message || 'Unknown error'}`);
    }

    console.log('[PROOF SUCCESS] PROOF SAVED SUCCESSFULLY! ID:', proofId);
    return proofId;
  } catch (error: any) {
    console.error('[PROOF ERROR] PROOF SAVE FAILED:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    
    // Provide more specific error message
    const errorMsg = error.message || 'Unknown error occurred';
    throw new Error(`Proof save failed: ${errorMsg}`);
  }
}

/**
 * Get proof from persistent storage
 * Now supports optional startTime parameter to match specific class
 */
export async function getProofPersistent(
  userId: string,
  date: string,
  subjectId: string,
  startTime?: string
): Promise<string | null> {
  try {
    console.log('[PROOF] Getting proof for:', { userId, date, subjectId, startTime });
    
    // List all files in directory
    const result = await Filesystem.readdir({
      path: PROOF_DIR,
      directory: Directory.Data,
    });

    console.log('[PROOF] Total files in directory:', result.files.length);

    // Build search prefix
    const basePrefix = `${userId}_${date}_${subjectId}`;
    const timeIdentifier = startTime ? `_${startTime.replace(':', '')}` : '';
    const fullPrefix = `${basePrefix}${timeIdentifier}`;

    console.log('[PROOF] Searching for files matching:', fullPrefix);

    // Find matching proof file
    // If startTime is provided, match exact time, otherwise match any file for this subject/date
    const matchingFile = result.files.find((file: any) => {
      const name = typeof file === 'string' ? file : file.name;
      const matches = startTime
        ? name.startsWith(fullPrefix) && name.endsWith('.webp')
        : name.startsWith(basePrefix) && name.endsWith('.webp');
      
      if (matches) {
        console.log('[PROOF] Found matching file:', name);
      }
      return matches;
    });

    if (!matchingFile) {
      console.log('[PROOF] No matching file found');
      return null;
    }

    const filename = typeof matchingFile === 'string' ? matchingFile : (matchingFile as any).name;
    console.log('[PROOF] Reading proof file:', filename);

    // Read the image file
    const fileData = await Filesystem.readFile({
      path: `${PROOF_DIR}/${filename}`,
      directory: Directory.Data,
    });

    console.log('[PROOF] Successfully loaded proof');
    // Return as data URL
    return `data:image/webp;base64,${fileData.data}`;
  } catch (error) {
    console.error('[PROOF ERROR] Error getting proof:', error);
    return null;
  }
}

/**
 * Get all proofs for a specific date
 */
export async function getProofsForDate(
  userId: string,
  date: string
): Promise<Array<ProofMetadata & { dataUrl: string }>> {
  try {
    const result = await Filesystem.readdir({
      path: PROOF_DIR,
      directory: Directory.Data,
    });

    const proofs: Array<ProofMetadata & { dataUrl: string }> = [];

    for (const file of result.files) {
      const filename = typeof file === 'string' ? file : (file as any).name;

      // Only process metadata files for this user and date
      if (
        filename.startsWith(`${userId}_${date}`) &&
        filename.endsWith('.json')
      ) {
        try {
          const metadataFile = await Filesystem.readFile({
            path: `${PROOF_DIR}/${filename}`,
            directory: Directory.Data,
          });

          // Decode base64 metadata back to JSON
          const metadataJson = atob(metadataFile.data as string);
          const metadata: ProofMetadata = JSON.parse(metadataJson);

          // Read corresponding image
          const imageFile = await Filesystem.readFile({
            path: `${PROOF_DIR}/${metadata.filename}`,
            directory: Directory.Data,
          });

          proofs.push({
            ...metadata,
            dataUrl: `data:image/webp;base64,${imageFile.data}`,
          });
        } catch (err) {
          console.error('Error reading proof file:', err);
        }
      }
    }

    return proofs.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error getting proofs for date:', error);
    return [];
  }
}

/**
 * Get all proofs grouped by subject
 */
export async function getProofsBySubject(
  userId: string
): Promise<Record<string, Array<ProofMetadata & { dataUrl: string }>>> {
  console.log('[PROOF] Getting proofs by subject for user:', userId);
  
  try {
    // First, try to ensure directory exists or check if it's there
    try {
      await ensureDirectory();
    } catch (dirError) {
      console.log('[PROOF] Directory might not exist yet, trying to read anyway');
    }
    
    console.log('[PROOF] Reading directory:', PROOF_DIR);
    const result = await Filesystem.readdir({
      path: PROOF_DIR,
      directory: Directory.Data,
    });

    console.log('[PROOF] Total files in directory:', result.files.length);
    const proofsBySubject: Record<string, Array<ProofMetadata & { dataUrl: string }>> = {};

    let processedFiles = 0;
    let skippedFiles = 0;

    for (const file of result.files) {
      const filename = typeof file === 'string' ? file : (file as any).name;

      // Only process metadata files for this user
      if (filename.startsWith(`${userId}_`) && filename.endsWith('.json')) {
        processedFiles++;
        console.log('[PROOF] Processing metadata file:', filename);
        try {
          const metadataFile = await Filesystem.readFile({
            path: `${PROOF_DIR}/${filename}`,
            directory: Directory.Data,
          });

          // Decode base64 metadata back to JSON
          const metadataJson = atob(metadataFile.data as string);
          const metadata: ProofMetadata = JSON.parse(metadataJson);
          console.log('[PROOF] Metadata parsed:', metadata);

          // Read corresponding image
          console.log('[PROOF] Reading image file:', metadata.filename);
          const imageFile = await Filesystem.readFile({
            path: `${PROOF_DIR}/${metadata.filename}`,
            directory: Directory.Data,
          });

          const proof = {
            ...metadata,
            dataUrl: `data:image/webp;base64,${imageFile.data}`,
          };

          if (!proofsBySubject[metadata.subjectId]) {
            proofsBySubject[metadata.subjectId] = [];
          }

          proofsBySubject[metadata.subjectId].push(proof);
          console.log('[PROOF] Successfully loaded proof for subject:', metadata.subjectId);
        } catch (err) {
          console.error('[PROOF ERROR] Error reading proof file:', filename, err);
          skippedFiles++;
        }
      }
    }

    console.log('[PROOF] Summary: Processed', processedFiles, 'metadata files,', skippedFiles, 'failed');
    console.log('[PROOF] Total subjects with proofs:', Object.keys(proofsBySubject).length);

    // Sort each subject's proofs by timestamp
    Object.keys(proofsBySubject).forEach((subjectId) => {
      proofsBySubject[subjectId].sort((a, b) => b.timestamp - a.timestamp);
    });

    return proofsBySubject;
  } catch (error: any) {
    console.error('[PROOF ERROR] Error getting proofs by subject:', error);
    console.error('[PROOF ERROR] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // If directory doesn't exist, return empty object (no proofs yet)
    const errorMsg = error?.message?.toLowerCase() || '';
    if (errorMsg.includes('does not exist') || errorMsg.includes('not found') || errorMsg.includes('no such file')) {
      console.log('[PROOF] Proof directory does not exist yet - no proofs saved');
      return {};
    }
    
    // For other errors, still return empty but log more details
    console.error('[PROOF ERROR] Unexpected error, returning empty result');
    return {};
  }
}

/**
 * Delete proof from persistent storage
 */
export async function deleteProofPersistent(
  userId: string,
  date: string,
  subjectId: string,
  startTime?: string
): Promise<void> {
  try {
    const result = await Filesystem.readdir({
      path: PROOF_DIR,
      directory: Directory.Data,
    });

    // Build search prefix - if startTime provided, match specific class, otherwise match all for that subject/date
    const timeIdentifier = startTime ? `_${startTime.replace(':', '')}` : '';
    const searchPrefix = `${userId}_${date}_${subjectId}${timeIdentifier}`;

    // Find matching proof files
    for (const file of result.files) {
      const filename = typeof file === 'string' ? file : (file as any).name;

      if (filename.startsWith(searchPrefix)) {
        await Filesystem.deleteFile({
          path: `${PROOF_DIR}/${filename}`,
          directory: Directory.Data,
        });
      }
    }
  } catch (error) {
    console.error('Error deleting proof:', error);
    throw new Error('Failed to delete proof');
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats(userId: string): Promise<{
  totalProofs: number;
  estimatedSize: string;
}> {
  try {
    const result = await Filesystem.readdir({
      path: PROOF_DIR,
      directory: Directory.Data,
    });

    let totalProofs = 0;
    let totalSize = 0;

    for (const file of result.files) {
      const filename = typeof file === 'string' ? file : (file as any).name;

      if (filename.startsWith(`${userId}_`) && filename.endsWith('.webp')) {
        totalProofs++;

        try {
          const stat = await Filesystem.stat({
            path: `${PROOF_DIR}/${filename}`,
            directory: Directory.Data,
          });

          totalSize += stat.size;
        } catch (err) {
          console.error('Error getting file stats:', err);
        }
      }
    }

    const sizeInMB = totalSize / (1024 * 1024);

    return {
      totalProofs,
      estimatedSize: `${sizeInMB.toFixed(2)} MB`,
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { totalProofs: 0, estimatedSize: '0 MB' };
  }
}

/**
 * Clear all proofs for a user
 */
export async function clearAllProofs(userId: string): Promise<void> {
  try {
    const result = await Filesystem.readdir({
      path: PROOF_DIR,
      directory: Directory.Data,
    });

    for (const file of result.files) {
      const filename = typeof file === 'string' ? file : (file as any).name;

      if (filename.startsWith(`${userId}_`)) {
        await Filesystem.deleteFile({
          path: `${PROOF_DIR}/${filename}`,
          directory: Directory.Data,
        });
      }
    }
  } catch (error) {
    console.error('Error clearing proofs:', error);
    throw new Error('Failed to clear proofs');
  }
}

/**
 * Helper: Convert File to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
