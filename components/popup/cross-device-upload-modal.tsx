"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import {
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Smartphone,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
interface CrossDeviceUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (url: string) => void;
  roomType: string;
  slotIndex: number;
  propertyId: string | null;
}

export function CrossDeviceUploadModal({
  open,
  onOpenChange,
  onUploadComplete,
  roomType,
  slotIndex,
  propertyId,
}: CrossDeviceUploadModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [uploadLink, setUploadLink] = useState<string | null>(null);
  const [status, setStatus] = useState<"waiting" | "uploading" | "completed">(
    "waiting"
  );
  const [copied, setCopied] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCopyLink = () => {
    if (uploadLink) {
      navigator.clipboard.writeText(uploadLink);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.info("Generating new QR code...");
  };

  useEffect(() => {
    if (open) {
      // Only generate new session if we don't have one, or if we want to force refresh
      // But for now, let's keep it simple: generate new one on open.
      // Ideally, we should persist this if the user closes and reopens for the SAME slot.
      // But the parent component resets activeUploadSlot when closed?
      // No, parent sets activeUploadSlot then opens modal.
      // If parent closes modal, it sets open=false.

      const newSessionId = Math.random().toString(36).substring(2, 15);
      setSessionId(newSessionId);
      setStatus("waiting");
      setCopied(false);
      setGeneratedAt(new Date());

      // Generate QR Code URL
      // In production, use the actual domain. For dev, we use window.location.origin
      const origin = window.location.origin;
      const url = `${origin}/upload-mobile/${newSessionId}?room=${roomType}&slot=${slotIndex}&propertyId=${propertyId || ""}`;
      setUploadLink(url);
      setQrUrl(
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
      );

      // Subscribe to Realtime
      const channel = supabase
        .channel(`upload-session-${newSessionId}`)
        .on(
          "broadcast",
          { event: "upload-complete" },
          (payload: { payload: { url: string } }) => {
            console.log("Received upload-complete event:", payload);
            if (payload.payload?.url) {
              setStatus("completed");
              onUploadComplete(payload.payload.url);
              toast.success("Image received from mobile device!");
              setTimeout(() => onOpenChange(false), 1000);
            }
          }
        )
        .subscribe((status: string) => {
          console.log("Subscription status:", status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [
    open,
    roomType,
    slotIndex,
    onOpenChange,
    onUploadComplete,
    propertyId,
    refreshTrigger,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col w-full">
        <DialogHeader className="w-full relative">
          <DialogTitle className="text-center w-full">
            Upload from Mobile
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 -mt-2 h-8 w-8 text-gray-400 hover:text-gray-600"
            onClick={handleRefresh}
            title="Refresh QR Code"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-4 space-y-6 w-full">
          {status === "waiting" && qrUrl && (
            <>
              <div className="relative w-48 h-48 bg-white p-2 rounded-lg shadow-sm border mx-auto group">
                <img src={qrUrl} alt="Scan QR Code" className="w-full h-full" />
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
                  <span className="bg-white/90 text-xs px-2 py-1 rounded shadow-sm text-gray-600 font-medium">
                    Scan Me
                  </span>
                </div>
              </div>

              {generatedAt && (
                <p className="text-[10px] text-gray-400 font-mono">
                  Generated at: {generatedAt.toLocaleTimeString()}
                </p>
              )}

              <div className="text-center space-y-2 w-full px-4">
                <p className="font-medium text-gray-900">
                  Scan with your phone camera
                </p>
                <p className="text-sm text-gray-500">
                  Take a photo or upload from your mobile device
                </p>
                {uploadLink && (
                  <div className="mt-6 w-full space-y-3">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-400">
                          Or share link
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1 min-w-0">
                        <a
                          href={uploadLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full hover:opacity-80 transition-opacity"
                          title="Click to open link"
                        >
                          <code className="block w-full bg-gray-50 border rounded-lg px-3 py-2 text-xs text-blue-600 truncate font-mono text-left hover:underline cursor-pointer">
                            {uploadLink}
                          </code>
                        </a>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                        onClick={handleCopyLink}
                        title="Copy Link"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mx-auto">
                <Smartphone className="w-4 h-4 mr-2" />
                <span>Waiting for connection...</span>
              </div>
              <p className="text-xs text-red-500 text-center mt-2">
                ⚠️ Please keep this window open until upload is complete
              </p>
            </>
          )}

          {status === "uploading" && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-gray-600">Receiving image...</p>
            </div>
          )}

          {status === "completed" && (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-green-600 font-medium">Upload Successful!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
