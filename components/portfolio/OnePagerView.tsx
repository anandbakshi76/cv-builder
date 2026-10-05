"use client";
import { useEffect, useRef, useState } from "react";
import type { Item, OnePager, Para } from "@/lib/export/pptx";
import { SLIDE } from "@/lib/export/pptx";

/* On-screen copy of the one-page PowerPoint. It draws exactly the same list of shapes and text boxes that the .pptx file
   is made from (positions in inches), so what you see here is what the downloaded slide contains.
   The slide is 13.333 x 7.5 in = 1280 x 720 CSS pixels; it is scaled to the width of its container. */

const PX = 96; // CSS pixels per inch
const MIN_SCALE = 0.6;
const px = (inch: number) => inch * PX;
const hex = (c?: string) => (c ? `#${c}` : undefined);

function paraStyle(p: Para, size: number): React.CSSProperties {
  return {
    fontSize: `${size * (p.mul ?? 1)}pt`,
    lineHeight: 1.22,
    marginBottom: `${p.after ?? 0}pt`,
    textAlign: p.align ?? "left",
    paddingLeft: p.bullet ? "11pt" : undefined,
    position: "relative",
  };
}

function Text({ it }: { it: Extract<Item, { k: "text" }> }) {
  return (
    <div
      style={{
        position: "absolute",
        left: px(it.x),
        top: px(it.y),
        width: px(it.w),
        height: px(it.h),
        display: it.valign === "middle" ? "flex" : "block",
        flexDirection: "column",
        justifyContent: it.valign === "middle" ? "center" : undefined,
        letterSpacing: it.charSpacing ? `${it.charSpacing}pt` : undefined,
        overflow: "visible",
      }}
    >
      {it.paras.map((p, i) => (
        <div key={i} style={paraStyle(p, it.size)}>
          {p.bullet && (
            <span aria-hidden style={{ position: "absolute", left: 0 }}>
              •
            </span>
          )}
          {p.runs.map((r, j) =>
            r.link ? (
              <a key={j} href={r.link} target="_blank" rel="noreferrer" style={{ fontWeight: r.bold ? 700 : 400, color: hex(r.color), textDecoration: "underline" }}>
                {r.text}
              </a>
            ) : (
              <span key={j} style={{ fontWeight: r.bold ? 700 : 400, color: hex(r.color) }}>
                {r.text}
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function Shape({ it }: { it: Extract<Item, { k: "rect" | "ellipse" }> }) {
  const round = it.k === "ellipse" ? "50%" : it.round ? px(it.round) : 0;
  const alpha = it.transp ? 1 - it.transp / 100 : 1;
  const col = it.fill ? hex(it.fill) : undefined;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: px(it.x),
        top: px(it.y),
        width: px(it.w),
        height: px(it.h),
        borderRadius: round,
        background: col,
        opacity: col ? alpha : undefined,
        borderStyle: it.line ? "solid" : undefined,
        borderWidth: it.line ? (it.lw ?? 1) * (PX / 72) : undefined,
        borderColor: it.line ? (it.transp && !it.fill ? `${hex(it.line)}${Math.round(alpha * 255).toString(16).padStart(2, "0")}` : hex(it.line)) : undefined,
        boxSizing: "border-box",
      }}
    />
  );
}

export default function OnePagerView({ layout, photo, name }: { layout: OnePager; photo: string; name: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    // on a phone the slide stays readable (never below 60%) and can be swiped sideways
    const on = () => setScale(Math.max(MIN_SCALE, el.clientWidth / px(SLIDE.w)));
    on();
    const ro = new ResizeObserver(on);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrap} className="pf-slide-wrap w-full overflow-x-auto overflow-y-hidden pb-2">
      <div className="pf-slide-box" style={{ width: px(SLIDE.w) * scale, height: px(SLIDE.h) * scale }}>
        <div
          className="pf-slide-stage overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200"
          role="img"
          aria-label={`One-page profile of ${name || "the owner"}`}
          style={{ position: "relative", width: px(SLIDE.w), height: px(SLIDE.h), transform: `scale(${scale})`, transformOrigin: "top left", fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif', color: hex(layout.textColor) }}
        >
          {layout.items.map((it, i) => {
            if (it.k === "text") return <Text key={i} it={it} />;
            if (it.k === "photo")
              // eslint-disable-next-line @next/next/no-img-element
              return <img key={i} src={photo} alt="" style={{ position: "absolute", left: px(it.x), top: px(it.y), width: px(it.d), height: px(it.d), borderRadius: "50%", objectFit: "cover" }} />;
            return <Shape key={i} it={it} />;
          })}
        </div>
      </div>
    </div>
  );
}
