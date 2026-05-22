import { useState } from "react";
import { fetchResumeBlob } from "@/services/adminCandidates";
import { MIME_TO_EXT } from "@/utils/mime";

function buildDownloadName(candidateName: string, fileKey: string, mimeType: string): string {
  const slug = candidateName.trim().replace(/\s+/g, "-");
  const keyExt = fileKey.includes(".") ? fileKey.split(".").pop() : undefined;
  const safeKeyExt = keyExt && /^[a-zA-Z0-9]{1,5}$/.test(keyExt) ? keyExt.toLowerCase() : undefined;
  const ext = MIME_TO_EXT[mimeType] ?? safeKeyExt ?? "bin";
  return `${slug}-resume.${ext}`;
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ResumeLink({
  fileKey,
  label,
  candidateName,
}: {
  fileKey: string;
  label: string;
  candidateName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  async function open(e: React.MouseEvent) {
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const blob = await fetchResumeBlob(fileKey);
      const mimeType = blob.type || "application/octet-stream";
      const filename = buildDownloadName(candidateName, fileKey, mimeType);
      const isPdf = mimeType === "application/pdf" || fileKey.toLowerCase().endsWith(".pdf");

      // iOS ignores <a download> on blob URLs — use Web Share API instead.
      // Scoped to iOS only: other platforms mishandle navigator.share with files.
      const isIOS =
        /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (isIOS && typeof navigator.canShare === "function") {
        const file = new File([blob], filename, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
            return;
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
          }
        }
      }

      const url = URL.createObjectURL(blob);
      if (isPdf || isIOS) {
        const win = window.open(url, "_blank");
        if (!win) triggerDownload(url, filename);
      } else {
        triggerDownload(url, filename);
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      console.error("Failed to fetch resume", err);
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <button
      onClick={open}
      disabled={isLoading}
      className={`text-copper hover:text-gold transition-opacity ${isLoading ? "opacity-50 cursor-wait" : ""}`}
    >
      {isLoading ? "טוען..." : `${label} ↗`}
    </button>
  );
}
