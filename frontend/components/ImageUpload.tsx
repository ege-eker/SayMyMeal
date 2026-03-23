"use client";

import { useRef, useState } from "react";
import { uploadImage, removeImage } from "@/lib/api";
import { ImagePlus, Loader2, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ImageUploadProps {
  entity: "foods" | "menus" | "restaurants";
  entityId: string;
  currentImageUrl?: string | null;
  onSuccess: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-20 aspect-square",
  md: "w-28 aspect-square",
  lg: "w-full h-40",
};

export default function ImageUpload({
  entity,
  entityId,
  currentImageUrl,
  onSuccess,
  className = "",
  size = "sm",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      await uploadImage(entity, entityId, file);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    setError("");
    try {
      await removeImage(entity, entityId);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Remove failed");
    } finally {
      setRemoving(false);
    }
  };

  const imgSrc = currentImageUrl ? `${API_URL}${currentImageUrl}` : null;
  const busy = uploading || removing;

  return (
    <div className={className}>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`${sizeClasses[size]} rounded-lg border-2 border-dashed border-gray-300 hover:border-amber-400 transition-colors overflow-hidden flex items-center justify-center bg-gray-50`}
        >
          {busy ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <ImagePlus className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {imgSrc && !busy && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
