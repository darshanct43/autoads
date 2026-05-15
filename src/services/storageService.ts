import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from '../lib/firebase';
import imageCompression from 'browser-image-compression';

export interface UploadProgress {
  progress: number;
  status: 'IDLE' | 'COMPRESSING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  url?: string;
  error?: string;
}

export const storageService = {
  async compressImage(file: File) {
    const options = {
      maxSizeMB: 0.8, // Target 800KB for better performance
      maxWidthOrHeight: 1280, // High quality but optimized
      useWebWorker: true,
    };
    try {
      // Only compress images
      if (!file.type.startsWith('image/')) return file;
      
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
      
      video.onloadedmetadata = () => {
        video.currentTime = 1; // Capture at 1 second
      };

      video.onseeked = () => {
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
    const path = `campaigns/${campaignId}/${isVideo ? 'videos' : 'posters'}/${Date.now()}_${file.name}`;
    
    // Upload main file
    const url = await this.uploadFile(path, file, (p) => {
      if (onProgress) onProgress(p.progress);
    });

    let thumbnailUrl = "";
    if (isVideo) {
      try {
        const thumbnailBlob = await this.generateVideoThumbnail(file);
        const thumbPath = `campaigns/${campaignId}/thumbnails/${Date.now()}_thumb.jpg`;
        thumbnailUrl = await this.uploadFile(thumbPath, new File([thumbnailBlob], "thumb.jpg", { type: 'image/jpeg' }));
      } catch (err) {
        console.warn("Could not generate thumbnail", err);
      }
    }

    return { url, thumbnailUrl };
  },

  /**
   * Uploads a file with progress tracking and compression
   */
  uploadFile(
    path: string, 
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        if (onProgress) onProgress({ progress: 0, status: 'COMPRESSING' });
        
        const fileToUpload = await this.compressImage(file);
        
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

        if (onProgress) onProgress({ progress: 0, status: 'UPLOADING' });

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress({ progress, status: 'UPLOADING' });
          },
          (error) => {
            console.error('[Storage] Upload error:', error);
            if (onProgress) onProgress({ progress: 0, status: 'ERROR', error: error.message });
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress({ progress: 100, status: 'SUCCESS', url: downloadURL });
            resolve(downloadURL);
          }
        );
      } catch (err: any) {
        if (onProgress) onProgress({ progress: 0, status: 'ERROR', error: err.message });
        reject(err);
      }
    });
  },

  async deleteFile(pathOrUrl: string) {
    try {
      // If it's a full URL, we might need to handle it differently, 
      // but ref() can handle some URL formats or we just pass the path.
      const storageRef = ref(storage, pathOrUrl);
      return await deleteObject(storageRef);
    } catch (error) {
      console.error('[Storage] Deletion failed:', error);
      throw error;
    }
  },

  // Path Helpers
  getDriverDocPath(driverId: string, docType: 'profile' | 'aadhar' | 'license' | 'rc' | 'insurance' | 'verification' | 'pan', fileName: string) {
    const ext = fileName.split('.').pop();
    return `drivers/${driverId}/${docType}/${docType}_${Date.now()}.${ext}`;
  },

  getCampaignMediaPath(campaignId: string, type: 'posters' | 'banners' | 'videos', fileName: string) {
    const ext = fileName.split('.').pop();
    return `campaigns/${campaignId}/${type}/${Date.now()}_${fileName}`;
  },

  getTicketMediaPath(ticketId: string, fileName: string) {
    return `tickets/${ticketId}/${Date.now()}_${fileName}`;
  }
};
