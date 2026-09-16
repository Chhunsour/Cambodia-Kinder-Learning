import {
  ContentPackManifest,
  DownloadOptions,
  DownloadProgress,
  ContentPackCurriculumData,
} from "../types";
import { ContentStorage } from "./contentStorage";
import {
  validateManifest,
  validateCurriculumData,
  validatePathSecurity,
  validateAssetIntegrity,
} from "./packValidator";
import { ContentPackRepository } from "@/storage/repositories/contentPackRepository";
import { IPackSource, defaultMockPackSource } from "../data/mockPackSource";
import { networkMonitor } from "@/lib/network/networkMonitor";
import { ParentSettingsService } from "@/features/parent/services/parentSettingsService";

export interface DownloadErrorDetails {
  userMessage: string;
  code: string;
  technicalError?: any;
}

export class DownloadManager {
  private packSource: IPackSource;
  private activeAborts: Map<string, AbortController> = new Map();

  constructor(packSource: IPackSource = defaultMockPackSource) {
    this.packSource = packSource;
  }

  public setPackSource(source: IPackSource) {
    this.packSource = source;
  }

  /**
   * Cancel an ongoing download.
   */
  public cancelDownload(packId: string): void {
    const controller = this.activeAborts.get(packId);
    if (controller) {
      controller.abort();
      this.activeAborts.delete(packId);
    }
  }

  /**
   * Main entry point to download, verify, and atomically install a content pack.
   */
  public async downloadAndInstallPack(
    manifest: ContentPackManifest,
    options?: DownloadOptions
  ): Promise<void> {
    const packId = manifest.id;

    // 1. Check network connectivity
    if (!networkMonitor.isOnline()) {
      throw {
        code: "OFFLINE",
        userMessage: "Connect to the internet to download this adventure.",
      } as DownloadErrorDetails;
    }

    // 2. Check Wi-Fi only restriction
    const downloadSettings = await ParentSettingsService.getDownloadSettings();
    if (downloadSettings.downloadWifiOnly) {
      const connType = networkMonitor.getConnectionType();
      if (connType === "cellular") {
        throw {
          code: "CELLULAR_BLOCKED",
          userMessage: "Connect to Wi-Fi or change download settings in Parent Area.",
        } as DownloadErrorDetails;
      }
    }

    // 3. Check storage space
    const freeSpace = await ContentStorage.getFreeDiskSpace();
    const requiredSpace = (manifest.estimatedSizeBytes || 1024 * 1024) * 1.5;
    if (freeSpace < requiredSpace) {
      throw {
        code: "INSUFFICIENT_STORAGE",
        userMessage: "Not enough storage for this adventure.",
      } as DownloadErrorDetails;
    }

    // 4. Validate manifest before downloading
    const manifestCheck = validateManifest(manifest);
    if (!manifestCheck.isValid) {
      const errorMsg = manifestCheck.errors.join("; ");
      await ContentPackRepository.updateStatus(packId, "failed", 0, 0, errorMsg);
      throw {
        code: "INVALID_MANIFEST",
        userMessage: "Could not download: Invalid adventure package.",
        technicalError: errorMsg,
      } as DownloadErrorDetails;
    }

    // 5. Setup staging temp directory
    const stagingDir = ContentStorage.getPackStagingDirectory(packId);
    const finalDir = ContentStorage.getPackDirectory(packId);

    // Clean any previous interrupted staging
    await ContentStorage.deletePath(stagingDir);
    await ContentStorage.ensureDirectory(stagingDir);

    const abortController = new AbortController();
    this.activeAborts.set(packId, abortController);

    // Track real byte progress
    const totalFiles = [
      manifest.curriculumFile,
      ...manifest.assets,
    ];
    const totalBytes = totalFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
    let downloadedBytes = 0;

    // Mark status downloading in SQLite
    await ContentPackRepository.updateStatus(packId, "downloading", 0, totalBytes, null);

    const reportProgress = (bytesAdded: number) => {
      downloadedBytes += bytesAdded;
      const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
      options?.onProgress?.({
        packId,
        downloadedBytes,
        totalBytes,
        percent,
      });
      ContentPackRepository.updateStatus(packId, "downloading", downloadedBytes, totalBytes, null).catch(() => {});
    };

    try {
      // 6. Download and verify curriculum JSON
      if (abortController.signal.aborted) throw new Error("Download cancelled");

      const currPath = manifest.curriculumFile.path;
      if (!validatePathSecurity(currPath)) {
        throw new Error(`Path traversal blocked: "${currPath}"`);
      }

      const rawCurriculum = await this.packSource.fetchPackFile(packId, currPath, manifest.version);
      const isCurriculumValid = await validateAssetIntegrity(rawCurriculum, manifest.curriculumFile.checksum);
      if (!isCurriculumValid) {
        throw new Error(`Checksum mismatch for curriculum file: ${currPath}`);
      }

      // Parse and validate curriculum data structure & activity types
      let parsedCurriculum: ContentPackCurriculumData;
      try {
        parsedCurriculum = JSON.parse(rawCurriculum);
      } catch (e) {
        throw new Error("Curriculum file is not valid JSON");
      }

      const currDataCheck = validateCurriculumData(parsedCurriculum, manifest);
      if (!currDataCheck.isValid) {
        throw new Error(`Curriculum validation failed: ${currDataCheck.errors.join("; ")}`);
      }

      // Write curriculum to staging
      const stagingCurriculumPath = `${stagingDir}${currPath}`;
      await ContentStorage.writeFile(stagingCurriculumPath, rawCurriculum);
      reportProgress(manifest.curriculumFile.sizeBytes);

      // 7. Download and verify each media asset
      for (const asset of manifest.assets) {
        if (abortController.signal.aborted) throw new Error("Download cancelled");

        if (!validatePathSecurity(asset.path)) {
          throw new Error(`Path traversal blocked: "${asset.path}"`);
        }

        const rawAssetContent = await this.packSource.fetchPackFile(packId, asset.path, manifest.version);
        const isAssetValid = await validateAssetIntegrity(rawAssetContent, asset.checksum);

        if (!isAssetValid) {
          if (asset.required !== false) {
            throw new Error(`Checksum mismatch for required asset: ${asset.key} (${asset.path})`);
          } else {
            console.warn(`[DownloadManager] Optional asset ${asset.key} failed checksum, skipping`);
            continue;
          }
        }

        // Write asset to staging
        const stagingAssetPath = `${stagingDir}${asset.path}`;
        await ContentStorage.writeFile(stagingAssetPath, rawAssetContent);
        reportProgress(asset.sizeBytes);
      }

      // 8. Save copy of manifest.json in staging
      await ContentStorage.writeFile(`${stagingDir}manifest.json`, JSON.stringify(manifest, null, 2));

      // 9. Atomic Installation: Move staging directory to final pack directory
      await ContentStorage.atomicMoveDirectory(stagingDir, finalDir);

      // 10. Update SQLite repository to installed
      await ContentPackRepository.markInstalled(
        packId,
        finalDir,
        manifest.checksum,
        totalBytes,
        manifest.version,
        manifest.contentVersion
      );

      // Final progress notification
      options?.onProgress?.({
        packId,
        downloadedBytes: totalBytes,
        totalBytes,
        percent: 100,
      });
    } catch (err: any) {
      // Clean staging files safely on failure
      await ContentStorage.deletePath(stagingDir).catch(() => {});

      const isAborted = abortController.signal.aborted || err?.message === "Download cancelled";
      const errorMsg = isAborted ? "Download paused" : (err?.message || "Could not download");

      await ContentPackRepository.updateStatus(
        packId,
        isAborted ? "not_downloaded" : "failed",
        downloadedBytes,
        totalBytes,
        errorMsg
      );

      if (isAborted) {
        throw {
          code: "CANCELLED",
          userMessage: "Download paused",
        } as DownloadErrorDetails;
      }

      throw {
        code: "DOWNLOAD_FAILED",
        userMessage: "Could not download. Try again.",
        technicalError: errorMsg,
      } as DownloadErrorDetails;
    } finally {
      this.activeAborts.delete(packId);
    }
  }
}

export const downloadManager = new DownloadManager();
