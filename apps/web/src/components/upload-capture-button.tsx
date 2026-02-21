"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@synthesis/ui";
import { useUploadThing } from "@/lib/uploadthing";
import { trpc } from "@/trpc/client";

export function UploadCaptureButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const utils = trpc.useUtils();
  const createCapture = trpc.capture.create.useMutation({
    onSuccess: () => utils.capture.list.invalidate(),
  });

  const { startUpload } = useUploadThing("imageUploader", {
    onUploadBegin: () => setIsUploading(true),
    onClientUploadComplete: async (res) => {
      const file = res?.[0];
      if (file?.serverData?.imageUrl) {
        await createCapture.mutateAsync({ imageUrl: file.serverData.imageUrl });
      }
      setIsUploading(false);
    },
    onUploadError: () => setIsUploading(false),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      startUpload(Array.from(files));
    }
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        size="sm"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? "Uploading..." : "Upload Screenshot"}
      </Button>
    </>
  );
}
