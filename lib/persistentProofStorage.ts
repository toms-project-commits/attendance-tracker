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
    console.log('✓ Proof directory ensured:', PROOF_DIR);
  } catch (error: any) {
    // Directory might already exist, that's fine
    if (error?.message && !error.message.includes('exists') && !error.message.includes('Directory exists')) {
      console.error('❌ Error creating directory:', error);
      throw new Error(`Failed to create storage directory: ${error.message}`);
    }
    console.log('✓ Proof directory already exists');
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
  imageFile: File
): Promise<string> {
  console.log('📸 Starting proof save...', { userId, date, subjectId, subjectName, fileSize: imageFile.size });
  
  try {
    // Step 1: Ensure directory exists
    console.log('📁 Step 1: Ensuring directory exists...');
    await ensureDirectory();
    console.log('✓ Directory ready');

    // Step 2: Generate unique filename
    const timestamp = Date.now();
    const filename = `${userId}_${date}_${subjectId}_${timestamp}.webp`;
    const proofId = `proof_${timestamp}`;
    console.log('✓ Step 2: Generated filename:', filename);

    // Step 3: Convert File to base64
    console.log('🔄 Step 3: Converting image to base64...');
    const base64Data = await fileToBase64(imageFile);
    console.log('✓ Base64 conversion complete, length:', base64Data.length);

    // Step 4: Save image file
    console.log('💾 Step 4: Writing image file to filesystem...');
    try {
      await Filesystem.writeFile({
        path: `${PROOF_DIR}/${filename}`,
        data: base64Data,
        directory: Directory.Data,
      });
      console.log('✓ Image file saved successfully');
    } catch (writeError: any) {
      console.error('❌ Failed to write image file:', writeError);
      throw new Error(`File write failed: ${writeError.message || 'Unknown error'}`);
    }

    // Step 5: Save metadata
    console.log('📝 Step 5: Writing metadata file...');
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
      await Filesystem.writeFile({
        path: `${PROOF_DIR}/${filename}.json`,
        data: JSON.stringify(metadata),
        directory: Directory.Data,
      });
      console.log('✓ Metadata saved successfully');
    } catch (metaError: any) {
      console.error('❌ Failed to write metadata:', metaError);
      // Try to cleanup the image file
      try {
        await Filesystem.deleteFile({
          path: `${PROOF_DIR}/${filename}`,
          directory: Directory.Data,
        });
        console.log('🧹 Cleaned up orphaned image file');
      } catch (cleanupError) {
        console.error('⚠️ Could not cleanup orphaned file:', cleanupError);
      }
      throw new Error(`Metadata write failed: ${metaError.message || 'Unknown error'}`);
    }

    console.log('✅ PROOF SAVED SUCCESSFULLY! ID:', proofId);
    return proofId;
  } catch (error: any) {
    console.error('❌ PROOF SAVE FAILED:', error);
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
 */
export async function getProofPersistent(
  userId: string,
  date: string,
  subjectId: string
): Promise<string | null> {
  try {
    // List all files in directory
    const result = await Filesystem.readdir({
      path: PROOF_DIR,
      directory: Directory.Data,
    });

    // Find matching proof file
    const matchingFile = result.files.find((file: any) => {
      const name = typeof file === 'string' ? file : file.name;
      return (
        name.startsWith(`${userId}_${date}_${subjectId}`) &&
        name.endsWith('.webp')
      );
    });

    if (!matchingFile) {
      return null;
    }

    const filename = typeof matchingFile === 'string' ? matchingFile : (matchingFile as any).name;

    // Read the image file
    const fileData = await Filesystem.readFile({
      path: `${PROOF_DIR}/${filename}`,
      directory: Directory.Data,
    });

    // Return as data URL
    return `data:image/webp;base64,${fileData.data}`;
  } catch (error) {
    console.error('Error getting proof:', error);
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

          const metadata: ProofMetadata = JSON.parse(metadataFile.data as string);

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
  try {
    const result = await Filesystem.readdir({
      path: PROOF_DIR,
      directory: Directory.Data,
    });

    const proofsBySubject: Record<string, Array<ProofMetadata & { dataUrl: string }>> = {};

    for (const file of result.files) {
      const filename = typeof file === 'string' ? file : (file as any).name;

      // Only process metadata files for this user
      if (filename.startsWith(`${userId}_`) && filename.endsWith('.json')) {
        try {
          const metadataFile = await Filesystem.readFile({
            path: `${PROOF_DIR}/${filename}`,
            directory: Directory.Data,
          });

          const metadata: ProofMetadata = JSON.parse(metadataFile.data as string);

          // Read corresponding image
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
        } catch (err) {
          console.error('Error reading proof file:', err);
        }
      }
    }

    // Sort each subject's proofs by timestamp
    Object.keys(proofsBySubject).forEach((subjectId) => {
      proofsBySubject[subjectId].sort((a, b) => b.timestamp - a.timestamp);
    });

    return proofsBySubject;
  } catch (error) {
    console.error('Error getting proofs by subject:', error);
    return {};
  }
}

/**
 * Delete proof from persistent storage
 */
export async function deleteProofPersistent(
  userId: string,
  date: string,
  subjectId: string
): Promise<void> {
  try {
    const result = await Filesystem.readdir({
      path: PROOF_DIR,
      directory: Directory.Data,
    });

    // Find matching proof files
    for (const file of result.files) {
      const filename = typeof file === 'string' ? file : (file as any).name;

      if (filename.startsWith(`${userId}_${date}_${subjectId}`)) {
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
