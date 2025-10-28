/**
 * Utility function to convert Fabric.js canvas to PNG blob
 * @param canvas - Fabric.js canvas instance
 * @param quality - Image quality (0-1, default: 1)
 * @returns Promise<Blob> - PNG blob
 */
export const canvasToPngBlob = async (canvas: any, quality: number = 1): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Convert canvas to data URL
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: quality,
        multiplier: 1, // Use original resolution
      });

      // Convert data URL to blob
      const byteString = atob(dataURL.split(',')[1]);
      const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];

      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0;i < byteString.length;i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([ab], { type: mimeString });
      resolve(blob);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Utility function to convert Fabric.js canvas to File object
 * @param canvas - Fabric.js canvas instance
 * @param filename - Name for the file (default: 'canvas.png')
 * @param quality - Image quality (0-1, default: 1)
 * @returns Promise<File> - PNG file
 */
export const canvasToPngFile = async (
  canvas: any,
  filename: string = 'canvas.png',
  quality: number = 1
): Promise<File> => {
  const blob = await canvasToPngBlob(canvas, quality);
  return new File([blob], filename, { type: 'image/png' });
};
