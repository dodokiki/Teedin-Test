import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import React, { useRef } from "react";

interface PDFExportProps {
  children: React.ReactNode;
  filename?: string;
  onExport?: () => void;
  scale?: number;
  format?: [number, number];
  orientation?: "portrait" | "landscape";
}

export const PDFExport: React.FC<PDFExportProps> = ({
  children,
  filename = "document",
  onExport,
  scale = 3,
  format = [794, 1123],
  orientation = "portrait",
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!contentRef.current) return;

    try {
      const canvas = await html2canvas(contentRef.current, { scale });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format,
      });

      const imgWidth = format[0] - 40; // 20px margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
      pdf.save(`${filename}.pdf`);

      onExport?.();
    } catch (error) {
      console.error("PDF export failed:", error);
    }
  };

  return (
    <div className="pdf-export-root">
      <div ref={contentRef}>{children}</div>
      <button
        onClick={handleExport}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Export PDF
      </button>
    </div>
  );
};
