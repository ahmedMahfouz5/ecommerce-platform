import { useRef, useState, type ChangeEvent } from "react";
import {
  requestUploadUrl,
  confirmUpload,
  validateImageFile,
} from "../api/images";
import { s3Upload } from "../api/client";

interface ImageUploaderProps {
  productId: string;
  onUploaded: () => void;
}

type UploadStep =
  | { stage: "idle" }
  | { stage: "validating" }
  | { stage: "error"; message: string }
  | { stage: "requesting-url" }
  | { stage: "uploading"; progress: number } // 0-100
  | { stage: "confirming" }
  | { stage: "done" };

export function ImageUploader({ productId, onUploaded }: ImageUploaderProps) {
  const [step, setStep] = useState<UploadStep>({ stage: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Client-side validation
    setStep({ stage: "validating" });
    const validationError = validateImageFile(file);
    if (validationError) {
      setStep({ stage: "error", message: validationError });
      return;
    }

    // 2. Request presigned URL from backend
    setStep({ stage: "requesting-url" });
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const { upload_url, object_key, content_type } = await requestUploadUrl(
        productId,
        file.type,
        file.size,
        ctrl.signal,
      );

      // 3. Upload directly to S3
      setStep({ stage: "uploading", progress: 0 });
      await s3Upload(upload_url, file, content_type, (pct) => {
        setStep({ stage: "uploading", progress: pct });
      }, ctrl.signal);

      // 4. Confirm with backend
      setStep({ stage: "confirming" });
      await confirmUpload(productId, object_key, ctrl.signal);

      // 5. Done
      setStep({ stage: "done" });
      onUploaded();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStep({ stage: "idle" });
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Upload failed";
      setStep({ stage: "error", message });
    } finally {
      abortRef.current = null;
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setStep({ stage: "idle" });
  };

  const handleReset = () => {
    setStep({ stage: "idle" });
  };

  return (
    <div className="image-uploader">
      {step.stage === "idle" && (
        <label className="image-uploader__label">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelected}
            className="image-uploader__input"
          />
          Choose Image
        </label>
      )}

      {step.stage === "validating" && (
        <p className="image-uploader__status">Validating file...</p>
      )}

      {step.stage === "requesting-url" && (
        <p className="image-uploader__status">Preparing upload...</p>
      )}

      {step.stage === "uploading" && (
        <div className="image-uploader__progress">
          <progress value={step.progress} max={100} />
          <span>{step.progress}%</span>
          <button
            type="button"
            className="image-uploader__cancel-btn"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      )}

      {step.stage === "confirming" && (
        <p className="image-uploader__status">Finalizing upload...</p>
      )}

      {step.stage === "done" && (
        <div className="image-uploader__done">
          <p>Upload complete!</p>
          <button
            type="button"
            className="image-uploader__upload-another"
            onClick={handleReset}
          >
            Upload Another Image
          </button>
        </div>
      )}

      {step.stage === "error" && (
        <div className="image-uploader__error" role="alert">
          <p>{step.message}</p>
          <button
            type="button"
            className="image-uploader__retry-btn"
            onClick={handleReset}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
