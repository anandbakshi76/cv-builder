"use client";
import { useEffect, useRef, useState } from "react";
import { useEditing } from "./Editable";

const SIZE = 240;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Centre-crops to a square and downsizes so the Base64 string stays small for localStorage. */
function toSquareJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;
      // JPEG has no transparency: without a white base, transparent PNG/WebP/GIF areas would turn black.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

export function PhotoUpload({ photo, onChange }: { photo: string; onChange: (v: string) => void }) {
  const editing = useEditing();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(""), 6000);
    return () => window.clearTimeout(t);
  }, [error]);

  if (!editing && !photo) return null;

  const pick = async (f: File) => {
    if (!ACCEPT.includes(f.type)) {
      setError("Please choose a JPG, PNG, WebP or GIF image.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`That image is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`);
      return;
    }
    try {
      onChange(await toSquareJpeg(f));
      setError("");
    } catch {
      setError("Could not read that image. Try another file.");
    }
  };

  return (
    <div className="cv-photo group relative h-20 w-20 shrink-0">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Profile" className="h-20 w-20 rounded-full object-cover ring-[3px] ring-white/50" />
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-white/60 text-center text-xs italic text-white/80 hover:bg-white/15"
        >
          Upload Photo
        </button>
      )}
      {editing && photo && (
        <div className="absolute inset-x-0 -bottom-2 flex justify-center gap-1 text-xs opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" onClick={() => input.current?.click()} className="cursor-pointer rounded bg-slate-800 px-2 py-0.5 text-white">
            Change
          </button>
          <button type="button" onClick={() => onChange("")} className="cursor-pointer rounded bg-slate-800 px-2 py-0.5 text-white">
            Remove
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="no-print absolute left-0 top-full z-10 mt-2 w-52 rounded-lg bg-slate-900/90 px-2 py-1.5 text-[11px] leading-snug text-white shadow">
          {error}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        data-testid="photo-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void pick(f);
        }}
      />
    </div>
  );
}
