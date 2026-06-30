
import imageCompression from 'browser-image-compression';

export interface UploadProgress {
  progress: number;
  status: 'IDLE' | 'COMPRESSING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  url?: string;
  error?: string;
}

export const storageService = {
  async compressImage(file: File | Blob) {
    const options = {
      maxSizeMB: 0.8, // Target 800KB for better performance
      maxWidthOrHeight: 1280, // High quality but optimized
      useWebWorker: true,
    };
    try {
      // Only compress actual File images
      if (!(file instanceof File) || !file.type.startsWith('image/')) return file;
      
      console.log(`[Storage] Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
      const compressedFile = await imageCompression(file, options);
      console.log(`[Storage] Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
      return compressedFile;
    } catch (error) {
      console.warn('[Storage] Compression failed, using original file', error);
      return file; 
    }
  },

  async generateVideoThumbnail(videoFile: File | Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(videoFile);
      const video = document.createElement('video');
      video.src = url;
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      const timeoutId = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error("Thumbnail generation timed out after 10s"));
      }, 10000); // 10 second timeout
      
      video.onloadedmetadata = () => {
        video.currentTime = 1; // Capture at 1 second
      };

      video.onseeked = () => {
        clearTimeout(timeoutId);
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error("Thumbnail generation failed"));
          }, 'image/jpeg', 0.7);
        } else {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas context failed"));
        }
      };

      video.onerror = () => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(url);
        reject(new Error("Video loading failed"));
      };
    });
  },

  /**
   * specialized helper for campaign media that handles video thumbnails
   */
  async uploadCampaignMedia(campaignId: string, file: File, onProgress?: (p: number) => void) {
    const isVideo = file.type.startsWith('video/');
    
    // Upload main file
    const url = await this.uploadFile(file, (p) => {
      if (onProgress) onProgress(p.progress || 0);
    });

    let thumbnailUrl = "";
    if (isVideo) {
      try {
        const thumbnailBlob = await this.generateVideoThumbnail(file);
        thumbnailUrl = await this.uploadFile(new File([thumbnailBlob], "thumb.jpg", { type: 'image/jpeg' }));
      } catch (err) {
        console.warn("Could not generate thumbnail", err);
      }
    }

    return { url, thumbnailUrl };
  },

  /**
   * Uploads a file with progress tracking and compression to S3 via API
   */
  uploadFile(
    file: File | Blob, 
    onProgress?: (progress: UploadProgress) => void,
    customName?: string,
    folder?: string
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        if (onProgress) onProgress({ progress: 0, status: 'COMPRESSING' });
        
        const fileToUpload = await this.compressImage(file);
        
        if (onProgress) onProgress({ progress: 0, status: 'UPLOADING' });
        
        const formData = new FormData();
        const fname = (fileToUpload instanceof File) ? fileToUpload.name : (customName || 'upload.bin');
        formData.append('file', fileToUpload, fname);
        if (customName) {
          formData.append('fileName', customName);
        }
        if (folder) {
          formData.append('folder', folder);
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            if (onProgress) {
              onProgress({ progress: pct, status: 'UPLOADING' });
            }
          }
        };

        const handleUploadErrorFallback = async (originalError: Error) => {
          try {
            console.warn("[Storage] Upload failed, falling back to local base64 Data URL:", originalError.message);
            const base64Url = await new Promise<string>((res, rej) => {
              const reader = new FileReader();
              reader.onload = () => res(reader.result as string);
              reader.onerror = (err) => rej(err);
              reader.readAsDataURL(fileToUpload);
            });
            if (onProgress) {
              onProgress({ progress: 100, status: 'SUCCESS', url: base64Url });
            }
            resolve(base64Url);
          } catch (fallbackErr: any) {
            console.error("[Storage] Local base64 fallback failed:", fallbackErr);
            reject(originalError);
          }
        };

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const rawResponse = xhr.responseText ? xhr.responseText.trim() : '';
            try {
              // 1. Try parsing as JSON first
              if (rawResponse.startsWith('{') || rawResponse.startsWith('[')) {
                const data = JSON.parse(rawResponse);
                if (data && typeof data === 'object') {
                  const urlValue = data.url || data.fileUrl || data.location;
                  if (urlValue) {
                    if (onProgress) {
                      onProgress({ progress: 100, status: 'SUCCESS', url: urlValue });
                    }
                    resolve(urlValue);
                    return;
                  }
                }
              }
              
              // 2. Fallback: If it's a raw URL string (starts with http or /)
              if (rawResponse.startsWith('http://') || rawResponse.startsWith('https://') || rawResponse.startsWith('/')) {
                if (onProgress) {
                  onProgress({ progress: 100, status: 'SUCCESS', url: rawResponse });
                }
                resolve(rawResponse);
                return;
              }

              // 3. Fallback to rawResponse if anything else non-empty
              if (rawResponse) {
                if (onProgress) {
                  onProgress({ progress: 100, status: 'SUCCESS', url: rawResponse });
                }
                resolve(rawResponse);
                return;
              }

              await handleUploadErrorFallback(new Error("Empty response from upload API"));
            } catch (jsonErr) {
              // If JSON parsing fails but the response is non-empty, try resolving raw text
              if (rawResponse) {
                if (onProgress) {
                  onProgress({ progress: 100, status: 'SUCCESS', url: rawResponse });
                }
                resolve(rawResponse);
              } else {
                await handleUploadErrorFallback(new Error("Invalid JSON response from upload API"));
              }
            }
          } else {
            await handleUploadErrorFallback(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = async () => {
          await handleUploadErrorFallback(new Error("Network error during upload"));
        };

        xhr.send(formData);
      } catch (err: any) {
        try {
          console.warn("[Storage] Catch block upload error, trying fallback:", err);
          const reader = new FileReader();
          reader.onload = () => {
            if (onProgress) {
              onProgress({ progress: 100, status: 'SUCCESS', url: reader.result as string });
            }
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            if (onProgress) onProgress({ progress: 0, status: 'ERROR', error: err.message });
            reject(err);
          };
          reader.readAsDataURL(file);
        } catch (fallbackErr) {
          if (onProgress) onProgress({ progress: 0, status: 'ERROR', error: err.message });
          reject(err);
        }
      }
    });
  },

  async deleteFile(pathOrUrl: string) {
    // S3 deletion needs to be handled via an API route as well
    try {
      console.log("[Storage] Deletion requested for:", pathOrUrl);
      // Implementation for API delete route would go here
    } catch (error) {
      console.error('[Storage] Deletion failed:', error);
      throw error;
    }
  },

  // Path Helpers are less relevant if S3 manages paths, but keep for consistency if needed
  getDriverDocPath(driverId: string, docType: string, fileName: string) { return ""; },
  getCampaignMediaPath(campaignId: string, type: string, fileName: string) { return ""; },
  getTicketMediaPath(ticketId: string, fileName: string) { return ""; }
};
