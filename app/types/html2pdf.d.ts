/* eslint-disable @typescript-eslint/no-explicit-any */
// types/html2pdf.d.ts
// Third-party library type definitions - any types are acceptable here
declare module "html2pdf.js" {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: {
      scale?: number;
      logging?: boolean;
      dpi?: number;
      letterRendering?: boolean;
      useCORS?: boolean; // เพิ่ม option ที่อาจเป็นประโยชน์
    };
    jsPDF?: {
      unit?: string;
      format?: string | number[];
      orientation?: string;
    };
    pagebreak?: {
      mode?: string | string[];
      before?: string | string[];
      after?: string | string[];
      avoid?: string | string[];
    };
    enableLinks?: boolean;
    [key: string]: any; // สำหรับ properties อื่นๆ ที่อาจจะไม่ได้ระบุไว้
  }

  interface Html2PdfWorker {
    from: (element: HTMLElement | string) => Html2PdfWorker;
    set: (opt: Html2PdfOptions) => Html2PdfWorker;
    // Add more methods as needed, e.g., toPdf, output, save, then
    toPdf: () => Promise<any>; // หรือปรับให้ตรงกับ return type ที่แท้จริง
    output: (type: string, options?: any) => Promise<any>;
    save: () => Promise<void>;
    // Chainable methods can return 'this' for fluent API
    then: (
      onfulfilled?: (value: any) => any,
      onrejected?: (reason: any) => any
    ) => Promise<any>;
  }

  function html2pdf(): Html2PdfWorker;
  function html2pdf(
    element: HTMLElement | string,
    opt?: Html2PdfOptions
  ): Promise<void>;

  export default html2pdf;
}
