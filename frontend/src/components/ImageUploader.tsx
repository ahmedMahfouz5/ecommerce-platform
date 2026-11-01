import { useRef, useState, type ChangeEvent } from "react";
import {
  requestUploadUrl,
  confirmUpload,
  validateImageFile,
} from "../api/images";
import { s3Upload } from "../api/client";
import { Button } from "./ui/button";
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

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
    <div className="max-w-sm space-y-3">
      {step.stage === "idle" && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Upload className="h-4 w-4" />
          Choose Image
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelected}
            className="sr-only"
          />
        </label>
      )}

      {step.stage === "validating" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validating file...
        </p>
      )}

      {step.stage === "requesting-url" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing upload...
        </p>
      )}

      {step.stage === "uploading" && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <progress
              value={step.progress}
              max={100}
              className="h-2 flex-1 rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
            />
            <span className="text-sm text-muted-foreground">{step.progress}%</span>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              <X className="mr-1 h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step.stage === "confirming" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finalizing upload...
        </p>
      )}

      {step.stage === "done" && (
        <div className="flex flex-col gap-2 rounded-md bg-green-50 p-3 dark:bg-green-950">
          <p className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            Upload complete!
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="self-start"
          >
            Upload Another Image
          </Button>
        </div>
      )}

      {step.stage === "error" && (
        <div className="flex flex-col gap-2 rounded-md bg-destructive/10 p-3" role="alert">
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {step.message}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="self-start"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
