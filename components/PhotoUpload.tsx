"use client";
import { useRef } from "react";
import { useEditing } from "./Editable";

const SIZE = 240;

/** Center-crops to a square and downsizes so the data URL stays small for localStorage. */
function toSquareJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = SIZE;
      canvas
        .getContext("2d")!
        .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export function PhotoUpload({ photo, onChange }: { photo: string; onChange: (v: string) => void }) {
  const editing = useEditing();
  const input = useRef<HTMLInputElement>(null);

  if (!editing && !photo) return null;

  return (
    <div className="group relative h-20 w-20 shrink-0">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Profile" className="h-20 w-20 rounded-full object-cover ring-[3px] ring-white/50" />
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-white/60 text-center text-xs italic text-white/80 hover:bg-white/15"
        >
          Add your photo
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
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        data-testid="photo-input"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onChange(await toSquareJpeg(f).catch(() => ""));
        }}
      />
    </div>
  );
}
