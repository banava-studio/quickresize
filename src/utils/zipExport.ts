/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { BatchItem } from '../core/batch/batchTypes';

/**
 * Sanitize a filename to prevent path traversal or invalid filesystem characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, '_') // Replace path separators
    .replace(/[<>:"|?*]/g, '') // Remove forbidden Windows/Unix characters
    .trim();
}

/**
 * Build a distinct, collision-free filename given a list of existing names in the archive
 */
export function getUniqueFilename(
  originalName: string,
  targetFormatExt: string,
  suffix = '_processed',
  existingNames: Set<string>
): string {
  const dotIndex = originalName.lastIndexOf('.');
  const rawBase = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
  
  // Clean unwanted repeated suffixes
  const cleanBase = sanitizeFilename(
    rawBase
      .replace(/_converted/gi, '')
      .replace(/_compressed(_\d+kb)?/gi, '')
      .replace(/_optimized(_\d+kb)?/gi, '')
      .replace(/_resized/gi, '')
      .trim()
  ) || 'image';

  const ext = targetFormatExt.toLowerCase().replace('jpeg', 'jpg');
  let candidate = `${cleanBase}${suffix}.${ext}`;
  let counter = 2;

  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${cleanBase}${suffix}_${counter}.${ext}`;
    counter++;
  }

  existingNames.add(candidate.toLowerCase());
  return candidate;
}

export interface ZipExportOptions {
  zipFilename?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Export completed batch items as a single flat ZIP file
 */
export async function exportBatchToZip(
  items: BatchItem[],
  options: ZipExportOptions = {}
): Promise<{ zipBlob: Blob; downloadFilename: string }> {
  const completedItems = items.filter(
    (item) => item.status === 'COMPLETED' && item.outputBlob
  );

  if (completedItems.length === 0) {
    throw new Error('No completed files available to archive');
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const item of completedItems) {
    if (!item.outputBlob) continue;

    const ext = (item.outputFormat || 'image/jpeg')
      .replace('image/', '')
      .replace('jpeg', 'jpg');

    const uniqueName = item.outputFilename || getUniqueFilename(
      item.filename,
      ext,
      '',
      usedNames
    );

    zip.file(uniqueName, item.outputBlob);
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (options.onProgress) {
        options.onProgress(Math.round(metadata.percent));
      }
    }
  );

  const defaultZipName = options.zipFilename || `QuickResize_${completedItems.length}_images.zip`;
  const sanitizedZipName = sanitizeFilename(defaultZipName);
  const downloadFilename = sanitizedZipName.endsWith('.zip')
    ? sanitizedZipName
    : `${sanitizedZipName}.zip`;

  return {
    zipBlob,
    downloadFilename,
  };
}

/**
 * Export arbitrary named blobs directly as a ZIP archive
 */
export async function exportMultipleBlobsToZip(
  entries: { name: string; blob: Blob }[],
  zipFilename = 'QuickResize_Exports.zip'
): Promise<{ zipBlob: Blob; downloadFilename: string }> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const entry of entries) {
    const dotIndex = entry.name.lastIndexOf('.');
    const base = dotIndex !== -1 ? entry.name.substring(0, dotIndex) : entry.name;
    const ext = dotIndex !== -1 ? entry.name.substring(dotIndex + 1) : 'jpg';

    const uniqueName = getUniqueFilename(entry.name, ext, '', usedNames);
    zip.file(uniqueName, entry.blob);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const downloadFilename = sanitizeFilename(zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`);

  return {
    zipBlob,
    downloadFilename
  };
}

/**
 * Trigger immediate browser download for a Blob
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = sanitizeFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Revoke in next microtask
  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}
