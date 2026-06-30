import React, { useState } from "react";
import { trpc } from "../trpc";

export function useMultiUpload() {
  const [uploadedBeforeImages, setUploadedBeforeImages] = useState<string[]>([]);
  const [uploadedBeforeVideos, setUploadedBeforeVideos] = useState<string[]>([]);
  const [uploadedAfterImages, setUploadedAfterImages] = useState<string[]>([]);
  const [uploadedAfterVideos, setUploadedAfterVideos] = useState<string[]>([]);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");

  const getPresignedUrlMutation = trpc.upload.getPresignedUrl.useMutation();

  const uploadSingleFile = async (file: File): Promise<string> => {
    const allowedImageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic"];
    const allowedVideoMimeTypes = ["video/mp4", "video/quicktime", "video/webm", "video/ogg"];
    const isImage = allowedImageMimeTypes.includes(file.type);
    const isVideo = allowedVideoMimeTypes.includes(file.type);

    if (!isImage && !isVideo) {
      throw new Error(`Invalid file format: "${file.name}". Only images and videos are supported.`);
    }

    if (isImage && file.size > 5 * 1024 * 1024) {
      throw new Error(`Image "${file.name}" exceeds 5MB size limit.`);
    }
    if (isVideo && file.size > 25 * 1024 * 1024) {
      throw new Error(`Video "${file.name}" exceeds 25MB size limit.`);
    }

    setUploadingFileName(file.name);
    setUploadProgress(0);

    const { uploadUrl, publicUrl, isLocal } = await getPresignedUrlMutation.mutateAsync({
      fileName: file.name,
      contentType: file.type,
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (isLocal) {
        const formData = new FormData();
        formData.append("file", file);

        xhr.open("POST", uploadUrl);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const percentComplete = Math.round((evt.loaded / evt.total) * 100);
            setUploadProgress(percentComplete);
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            const res = JSON.parse(xhr.responseText);
            resolve(res.url);
          } else {
            reject(new Error(`Failed to upload ${file.name} to local server.`));
          }
        };
        xhr.onerror = () => reject(new Error("Local upload connection failed."));
        xhr.send(formData);
      } else {
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.setRequestHeader("Cache-Control", "public, max-age=31536000, immutable");
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const percentComplete = Math.round((evt.loaded / evt.total) * 100);
            setUploadProgress(percentComplete);
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(publicUrl);
          } else {
            reject(new Error(`Failed to upload ${file.name} to GCS.`));
          }
        };
        xhr.onerror = () => reject(new Error("GCS upload connection failed."));
        xhr.send(file);
      }
    });
  };

  const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>, target: "before" | "after") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError("");
    const newImageUrls: string[] = [];
    const newVideoUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const url = await uploadSingleFile(file);
        const allowedImageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic"];
        if (allowedImageMimeTypes.includes(file.type)) {
          newImageUrls.push(url);
        } else {
          newVideoUrls.push(url);
        }
      } catch (err: any) {
        setUploadError(err.message || "Upload failed.");
        break;
      }
    }

    setUploadProgress(null);
    setUploadingFileName("");

    if (target === "before") {
      setUploadedBeforeImages((prev) => [...prev, ...newImageUrls]);
      setUploadedBeforeVideos((prev) => [...prev, ...newVideoUrls]);
    } else {
      setUploadedAfterImages((prev) => [...prev, ...newImageUrls]);
      setUploadedAfterVideos((prev) => [...prev, ...newVideoUrls]);
    }
  };

  const resetBeforeUploads = () => {
    setUploadedBeforeImages([]);
    setUploadedBeforeVideos([]);
  };

  const resetAfterUploads = () => {
    setUploadedAfterImages([]);
    setUploadedAfterVideos([]);
  };

  return {
    uploadedBeforeImages,
    uploadedBeforeVideos,
    uploadedAfterImages,
    uploadedAfterVideos,
    uploadProgress,
    uploadingFileName,
    uploadError,
    handleMultipleFilesChange,
    setUploadedBeforeImages,
    setUploadedBeforeVideos,
    setUploadedAfterImages,
    setUploadedAfterVideos,
    resetBeforeUploads,
    resetAfterUploads,
  };
}
