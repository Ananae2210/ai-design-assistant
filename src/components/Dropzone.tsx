"use client";

import { useState } from "react";

export default function Dropzone({ hasImage, onFile }: { hasImage: boolean; onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition-colors focus-within:ring-2 focus-within:ring-accent ${
        hasImage ? "px-6 py-5" : "px-6 py-14"
      } ${dragging ? "border-accent bg-accent/5" : "border-line bg-card hover:border-accent"}`}
    >
      <span className="text-base font-semibold">
        {hasImage ? "Drop another screenshot, or click to replace it" : "Drop a screenshot here, or click to upload"}
      </span>
      <span className="max-w-md text-sm text-muted">
        PNG, JPG or WebP. Colour checks run on your device. The image is only sent for AI review when you ask for one,
        and it isn&apos;t stored.
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
