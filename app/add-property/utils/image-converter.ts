/**
 * Utility functions for image conversion to WebP format
 */

export interface ImageConversionOptions {
  quality?: number; // 0-1, default 0.8
  maxWidth?: number; // optional max width for resizing
  maxHeight?: number; // optional max height for resizing
}

/**
 * Convert image file to WebP format
 * @param file - Original image file
 * @param options - Conversion options
 * @returns Promise<File> - WebP file
 */
export async function convertToWebP(
  file: File,
  options: ImageConversionOptions = {}
): Promise<File> {
  const { quality = 0.8, maxWidth, maxHeight } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions if maxWidth or maxHeight is specified
        let { width, height } = img;

        if (maxWidth && width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (maxHeight && height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw image to canvas
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        canvas.toBlob(
          blob => {
            if (blob) {
              // Create new File object with WebP extension
              const webpFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, ".webp"),
                {
                  type: "image/webp",
                  lastModified: Date.now(),
                }
              );
              resolve(webpFile);
            } else {
              reject(new Error("Failed to convert image to WebP"));
            }
          },
          "image/webp",
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert multiple image files to WebP format
 * @param files - Array of image files
 * @param options - Conversion options
 * @returns Promise<File[]> - Array of WebP files
 */
export async function convertMultipleToWebP(
  files: File[],
  options: ImageConversionOptions = {}
): Promise<File[]> {
  const conversionPromises = files.map(file => convertToWebP(file, options));
  return Promise.all(conversionPromises);
}

/**
 * Check if browser supports WebP format
 * @returns boolean
 */
export function isWebPSupported(): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
}

/**
 * Get optimal quality based on file size
 * @param originalSize - Original file size in bytes
 * @returns number - Quality value between 0-1
 */
export function getOptimalQuality(originalSize: number): number {
  // For large files (>2MB), use lower quality to reduce size
  if (originalSize > 2 * 1024 * 1024) {
    return 0.7;
  }
  // For medium files (500KB-2MB), use medium quality
  if (originalSize > 500 * 1024) {
    return 0.8;
  }
  // For small files (<500KB), use high quality
  return 0.9;
}
