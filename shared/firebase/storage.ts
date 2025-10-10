import { getStorage, ref, uploadBytesResumable, type UploadMetadata, type UploadTask } from 'firebase/storage';
import { getFirebaseApp } from './client';

export type UploadParams = {
  userId: string;
  file: Blob | Uint8Array | ArrayBuffer;
  filename: string;
  metadata?: UploadMetadata;
};

export function uploadUserAsset({ userId, file, filename, metadata }: UploadParams): UploadTask {
  const storage = getStorage(getFirebaseApp());
  const normalized = filename.startsWith('/') ? filename.slice(1) : filename;
  const path = ['uploads', userId, normalized].filter(Boolean).join('/');
  const storageRef = ref(storage, path);
  return uploadBytesResumable(storageRef, file, metadata);
}
