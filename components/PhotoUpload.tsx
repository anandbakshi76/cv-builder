"use client";
import { useEffect, useRef, useState } from "react";
import type { Header } from "@/lib/types";
import { useEditing } from "./Editable";
import { Modal } from "./Modal";

const SIZE = 240;
const TOP_BIAS = 0; // portrait photos: the square starts at the very top (head and hair); 0 = top-aligned, 0.5 = centred
const MAX_BYTES = 2.5 * 1024 * 1024; // 2.5 MB (the saved photo is always shrunk to 240 px, so this only limits the file you pick)
export const MAX_PHOTOS = 6; // library size: each photo is about 15-40 KB of browser storage and is copied into every saved version
/** JFIF is an ordinary JPEG file with another name; some systems report it with no type or as image/pjpeg. */
const ACCEPT_TYPES = ["image/jpeg", "image/pjpeg", "image/png", "image/webp", "image/gif"];
const ACCEPT_EXT = /\.(jpe?g|jfif|jpe|pjpeg|png|webp|gif)$/i;
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.jfif,.jpe,.pjpeg";

/** Crops to a square and downsizes so the Base64 string stays small for localStorage. Portrait photos keep their TOP
 *  (head and hair) and lose the bottom (shoulders): a plain centre crop cut the top of the head off. */
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
      const sx = (img.width - side) / 2;
      const sy = img.height > img.width ? (img.height - side) * TOP_BIAS : (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
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

interface Props {
  photo: string;
  onChange: (v: string) => void;
  /** photo library and the portfolio's photo (optional: without them this is the original single-photo control) */
  photos?: string[];
  portfolioPhoto?: string;
  onPatch?: (p: Partial<Header>) => void;
}

export function PhotoUpload({ photo, onChange, photos, portfolioPhoto = "", onPatch }: Props) {
  const editing = useEditing();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [manage, setManage] = useState(false);
  const library = photos ?? [];

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(""), 6000);
    return () => window.clearTimeout(t);
  }, [error]);

  if (!editing && !photo) return null;

  /** Adds a freshly uploaded photo to the library (if there is room) and makes it the CV photo. */
  const add = async (f: File) => {
    if (!ACCEPT_TYPES.includes(f.type) && !ACCEPT_EXT.test(f.name)) {
      setError("Please choose a JPG, JFIF, PNG, WebP or GIF image.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`That image is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 2.5 MB.`);
      return;
    }
    try {
      const url = await toSquareJpeg(f);
      if (onPatch) {
        const has = library.includes(url);
        if (!has && library.length >= MAX_PHOTOS) {
          setError(`The photo library is full (${MAX_PHOTOS}). Open Photos and delete one first.`);
          return;
        }
        onPatch({ photo: url, photos: has ? library : [...library, url] });
      } else onChange(url);
      setError("");
    } catch {
      setError("Could not read that image. Try another file.");
    }
  };

  const del = (url: string) => {
    if (!onPatch) return;
    const rest = library.filter((x) => x !== url);
    onPatch({ photos: rest, photo: photo === url ? "" : photo, portfolioPhoto: portfolioPhoto === url ? "" : portfolioPhoto });
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
      {editing && (photo || library.length > 0) && (
        <div className="absolute inset-x-0 -bottom-2 flex justify-center gap-1 text-xs opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          {photo && (
            <>
              <button type="button" onClick={() => input.current?.click()} className="cursor-pointer rounded bg-slate-800 px-2 py-0.5 text-white">
                {onPatch ? "Add" : "Change"}
              </button>
              <button type="button" onClick={() => onChange("")} className="cursor-pointer rounded bg-slate-800 px-2 py-0.5 text-white">
                Remove
              </button>
            </>
          )}
          {onPatch && library.length > 0 && (
            <button type="button" onClick={() => setManage(true)} className="cursor-pointer rounded bg-slate-800 px-2 py-0.5 text-white">
              Photos ({library.length})
            </button>
          )}
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
        accept={ACCEPT_ATTR}
        hidden
        data-testid="photo-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void add(f);
        }}
      />

      {manage && onPatch && (
        <Modal title="Your photos" onClose={() => setManage(false)} wide>
          <p className="text-sm text-slate-600">
            Choose which photo goes on the CV (and in Word, PDF, PowerPoint and HTML) and which one the portfolio site shows. Up to {MAX_PHOTOS} photos are kept in this browser.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {library.map((url, i) => {
              const onCv = url === photo;
              const onPf = (portfolioPhoto || photo) === url;
              return (
                <li key={url} className="rounded-xl border border-slate-200 p-3 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="mx-auto h-24 w-24 rounded-full object-cover" />
                  <p className="mt-2 flex min-h-5 flex-wrap justify-center gap-1 text-[11px] font-semibold">
                    {onCv && <span className="rounded-full bg-[var(--tint)] px-2 py-0.5 text-[var(--ink)]">On CV</span>}
                    {onPf && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">On portfolio</span>}
                  </p>
                  <div className="mt-2 flex flex-col gap-1 text-xs">
                    <button type="button" disabled={onCv} onClick={() => onPatch({ photo: url })} className="cursor-pointer rounded-full border border-slate-300 px-2 py-1 font-medium hover:bg-slate-50 disabled:cursor-default disabled:opacity-50">
                      Use on CV
                    </button>
                    <button type="button" disabled={onPf && portfolioPhoto === url} onClick={() => onPatch({ portfolioPhoto: url === photo ? "" : url })} className="cursor-pointer rounded-full border border-slate-300 px-2 py-1 font-medium hover:bg-slate-50 disabled:cursor-default disabled:opacity-50">
                      Use on portfolio
                    </button>
                    <button type="button" onClick={() => del(url)} className="cursor-pointer rounded-full px-2 py-1 font-medium text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => input.current?.click()} disabled={library.length >= MAX_PHOTOS} className="cursor-pointer rounded-full bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              Add a photo
            </button>
            {portfolioPhoto && (
              <button type="button" onClick={() => onPatch({ portfolioPhoto: "" })} className="cursor-pointer text-sm text-[var(--ink)] underline">
                Portfolio uses the same photo as the CV
              </button>
            )}
            <button type="button" data-close onClick={() => setManage(false)} className="ml-auto cursor-pointer rounded-full border border-slate-300 px-4 py-1.5 text-sm">
              Done
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Photos you do not use are still saved in the CV file, so delete any you would not want published before you export your CV for the portfolio.</p>
        </Modal>
      )}
    </div>
  );
}
