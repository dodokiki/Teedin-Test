"use client";

import React from "react";

interface TopLoaderProps {
  isLoading: boolean;
  color?: string;
  showSpinner?: boolean;
}

export function TopLoader({ 
  isLoading, 
  color = "#007AFF", 
  showSpinner = false 
}: TopLoaderProps) {
  if (!isLoading) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[200] h-1 bg-transparent overflow-hidden"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="h-full animate-[loading_2s_ease-in-out_infinite]"
        style={{
          background: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
      <style jsx>{`
        @keyframes loading {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 75%;
            margin-left: 12.5%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
