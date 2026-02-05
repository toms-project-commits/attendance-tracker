'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DebugProofsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>('');

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    checkProofs();
  }, []);

  const checkProofs = async () => {
    try {
      addLog('Starting proof debug check...');
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addLog('ERROR: No user found');
        return;
      }
      
      setUserId(user.id);
      addLog(`User ID: ${user.id}`);

      // Try to read the proof directory
      try {
        addLog('Attempting to read proof directory...');
        const result = await Filesystem.readdir({
          path: 'attendance-proofs',
          directory: Directory.Data,
        });
        
        addLog(`SUCCESS: Found ${result.files.length} files in proof directory`);
        
        const fileList = result.files.map((file: any) => {
          const name = typeof file === 'string' ? file : file.name;
          return {
            name,
            isUserFile: name.startsWith(user.id),
            isMetadata: name.endsWith('.json'),
            isImage: name.endsWith('.webp')
          };
        });
        
        setFiles(fileList);
        
        // Log user's files
        const userFiles = fileList.filter(f => f.isUserFile);
        addLog(`User has ${userFiles.length} files`);
        addLog(`Metadata files: ${userFiles.filter(f => f.isMetadata).length}`);
        addLog(`Image files: ${userFiles.filter(f => f.isImage).length}`);
        
        // List all user files
        userFiles.forEach(f => {
          addLog(`  - ${f.name}`);
        });
        
      } catch (dirError: any) {
        addLog(`ERROR reading directory: ${dirError.message}`);
        addLog('This usually means no proofs have been saved yet');
      }

      // Check if we can write a test file
      try {
        addLog('Testing write capability...');
        await Filesystem.writeFile({
          path: 'attendance-proofs/test.txt',
          data: btoa('test'),
          directory: Directory.Data,
        });
        addLog('SUCCESS: Write test passed');
        
        // Clean up test file
        await Filesystem.deleteFile({
          path: 'attendance-proofs/test.txt',
          directory: Directory.Data,
        });
        addLog('Cleaned up test file');
      } catch (writeError: any) {
        addLog(`ERROR in write test: ${writeError.message}`);
      }

    } catch (error: any) {
      addLog(`FATAL ERROR: ${error.message}`);
      addLog(`Stack: ${error.stack}`);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-black mb-4 text-black dark:text-white">
            Proof Storage Debug Tool
          </h1>
          
          {userId && (
            <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded">
              <p className="text-sm font-mono text-black dark:text-white">
                User ID: {userId}
              </p>
            </div>
          )}

          <button
            onClick={checkProofs}
            className="mb-4 px-4 py-2 bg-green-500 text-white font-bold rounded hover:bg-green-600"
          >
            Refresh Check
          </button>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2 text-black dark:text-white">Logs</h2>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))}
                {logs.length === 0 && <div>No logs yet...</div>}
              </div>
            </div>

            {files.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-2 text-black dark:text-white">
                  Files in Storage ({files.length})
                </h2>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                  {files.map((file, i) => (
                    <div key={i} className="mb-2 p-2 bg-white dark:bg-gray-600 rounded">
                      <span className="font-mono text-sm text-black dark:text-white">
                        {file.name}
                      </span>
                      <div className="flex gap-2 mt-1">
                        {file.isUserFile && <span className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 rounded">Your File</span>}
                        {file.isMetadata && <span className="text-xs px-2 py-1 bg-purple-200 dark:bg-purple-800 rounded">Metadata</span>}
                        {file.isImage && <span className="text-xs px-2 py-1 bg-green-200 dark:bg-green-800 rounded">Image</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
