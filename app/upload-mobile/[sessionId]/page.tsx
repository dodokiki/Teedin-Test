"use client";

import { supabase } from "@/lib/supabase";
import {
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  Upload,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function MobileUploadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const roomType = searchParams.get("room");
  const slotIndex = searchParams.get("slot");
  const propertyId = searchParams.get("propertyId");

  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // Detect in-app browsers (Line, Facebook, Instagram)
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isInApp =
      /FBAN|FBAV|Line|Instagram/i.test(ua) ||
      (/wv/.test(ua) && /Android/.test(ua)); // Android WebView

    if (isInApp) {
      setIsInAppBrowser(true);
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);

    try {
      // 1. Upload via API (to bypass RLS for anonymous users)
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "propertyId",
        propertyId || "mobile-session-" + sessionId
      );
      formData.append("scope", "mobile");
      if (roomType) formData.append("roomType", roomType);
      if (slotIndex) formData.append("slot", slotIndex);

      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      const publicUrl = result.publicUrl;

      // 2. Broadcast to Host via Realtime
      const channel = supabase.channel(`upload-session-${sessionId}`);

      // Wait for channel to subscribe
      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status: string) => {
          if (status === "SUBSCRIBED") resolve();
          else if (status === "CHANNEL_ERROR")
            reject(new Error("Channel error"));
        });
      });

      await channel.send({
        type: "broadcast",
        event: "upload-complete",
        payload: { url: publicUrl },
      });

      setCompleted(true);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full space-y-6 border border-gray-100">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm animate-in zoom-in duration-300">
            <Check className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Upload Successful!
            </h1>
            <p className="text-gray-500 leading-relaxed">
              The image has been sent to your computer. You can close this
              window now.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      {isInAppBrowser && (
        <div className="mb-6 w-full max-w-sm bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 shadow-sm">
          <p className="font-semibold mb-1">⚠️ Browser Warning</p>
          <p>
            For the best experience, please tap the menu (•••) and select{" "}
            <span className="font-bold">"Open in Browser"</span> or{" "}
            <span className="font-bold">"Open in Chrome/Safari"</span>.
          </p>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full space-y-8 border border-gray-100">
        <div className="space-y-3">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Photo</h1>
          <div className="inline-block px-4 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-600">
            {roomType
              ? `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} • Slot ${Number(slotIndex) + 1}`
              : "Upload a photo for your property"}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block w-full group">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              style={{ display: "none" }} // Force hide if CSS fails
              disabled={uploading}
            />
            <div className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center space-x-3 cursor-pointer transition-all shadow-lg shadow-blue-200 active:scale-95 group-hover:-translate-y-0.5">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
              <span className="text-lg">
                {uploading ? "Uploading..." : "Take Photo"}
              </span>
            </div>
          </label>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">Or</span>
            </div>
          </div>

          <label className="block w-full group">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              style={{ display: "none" }} // Force hide if CSS fails
              disabled={uploading}
            />
            <div className="w-full bg-white border-2 border-gray-200 text-gray-700 font-semibold py-4 rounded-2xl flex items-center justify-center space-x-3 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95">
              <ImageIcon className="w-6 h-6 text-gray-500" />
              <span className="text-lg">Choose from Gallery</span>
            </div>
          </label>
        </div>

        <div className="pt-4">
          <p className="text-xs text-gray-400 font-mono bg-gray-50 py-2 px-3 rounded-lg inline-block">
            Session: {sessionId.slice(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
}
