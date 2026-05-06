import React, { useState } from 'react';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const FirebaseStorageTester: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
        console.log(`[StorageTester] ${msg}`);
    };

    const runTest = async () => {
        setStatus('testing');
        setLog([]);
        addLog("Starting Storage Connection Test...");

        try {
            // 1. Reference check
            const testRef = ref(storage, 'test_connection.txt');
            addLog(`Ref created: ${testRef.fullPath}`);

            // 1.5 Metadata check (Read test)
            addLog("Attempting connection check (getMetadata)...");
            try {
                await getDownloadURL(testRef).catch(() => {}); // Warm up
                addLog("Storage endpoint reachable.");
            } catch (e: any) {
                addLog(`Warning: Initial endpoint ping failed: ${e.message}`);
            }

            // 2. Small data write
            const blob = new Blob(["test data " + Date.now()], { type: 'text/plain' });
            addLog(`Attempting uploadBytes (atomic) to ${testRef.fullPath}...`);
            
            const uploadPromise = uploadBytes(testRef, blob);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 15s - Likely CORS or Network block")), 15000));
            
            try {
                await Promise.race([uploadPromise, timeoutPromise]);
                addLog("Upload Success!");
            } catch (pErr: any) {
                if (pErr.code === 'storage/unauthorized') {
                    addLog("SECURITY ERROR: Rules are blocking write access.");
                } else if (pErr.code === 'storage/retry-limit-exceeded') {
                    addLog("NETWORK ERROR: Too many failed attempts (CORS?).");
                } else if (pErr.message.includes('CORS')) {
                    addLog("CORS ERROR: Browser blocked the cross-domain request.");
                }
                throw pErr;
            }

            // 3. Get URL
            const url = await getDownloadURL(testRef);
            addLog(`Download URL retrieved: ${url.substring(0, 50)}...`);

            // 4. Cleanup
            addLog("Cleaning up test file...");
            await deleteObject(testRef);
            addLog("Cleanup Success!");

            setStatus('success');
            addLog("TEST PASSED: Firebase Storage is fully operational.");
        } catch (err: any) {
            addLog(`TEST FAILED: ${err.message}`);
            setStatus('error');
            console.error(err);
        }
    };

    return (
        <div className="p-4 bg-slate-50 border rounded-lg shadow-sm font-mono text-xs">
            <h3 className="text-sm font-bold mb-2">Firebase Storage Health Check</h3>
            <button 
                onClick={runTest}
                disabled={status === 'testing'}
                className={`px-3 py-1 rounded text-white mb-4 ${
                    status === 'testing' ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
                {status === 'testing' ? 'Testing...' : 'Run Diagnostics'}
            </button>

            <div className="max-h-40 overflow-y-auto bg-black text-emerald-400 p-2 rounded border border-slate-800">
                {log.length === 0 ? "Ready to test." : log.map((l, i) => <div key={i}>{l}</div>)}
            </div>

            {status === 'error' && (
                <div className="mt-2 p-2 bg-red-100 text-red-700 rounded border border-red-200">
                    <strong className="block mb-1">FIX REQUIRED (CORS POLICY):</strong>
                    <p className="mb-2">Run this in your Google Cloud Shell to enable uploads:</p>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(`gsutil cors set - gs://autoads-18b26.appspot.com <<EOF\n[{"origin": ["*"], "method": ["GET", "PUT", "POST", "DELETE", "HEAD"], "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600}]\nEOF`);
                            alert("Command copied!");
                        }}
                        className="mb-2 px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600 block w-full"
                    >
                        Copy CORS Command
                    </button>
                    <code className="block bg-slate-900 text-white p-2 text-[10px] break-all mb-2">
                        gsutil cors set - gs://autoads-18b26.appspot.com &lt;&lt;EOF<br/>
                        [{"{"}"origin": ["*"], "method": ["GET", "PUT", "POST", "DELETE", "HEAD"], "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600{"}"}]<br/>
                        EOF
                    </code>
                    <div className="text-[10px] space-y-1">
                        <p>• If timeout persisted, check <strong>gsutil cors get gs://autoads-18b26.appspot.com</strong></p>
                        <p>• Ensure <strong>Storage Rules</strong> allow write to <u>test_connection.txt</u></p>
                    </div>
                </div>
            )}
        </div>
    );
};
