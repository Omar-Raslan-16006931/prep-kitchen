"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import type { Product, Unit } from "@/lib/calc";
import { cn } from "@/lib/utils";

/* ---------- layout ---------- */
export function Page({ title, sub, action, children }: { title: string; sub?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      className="flex flex-col gap-4"
      initial={{ opacity: 0.6, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
    >
      <header className="flex min-h-11 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] font-bold leading-tight text-sand [font-stretch:110%]">{title}</h1>
          {sub && <p className="mt-0.5 text-[13px] text-zinc-600">{sub}</p>}
        </div>
        {action}
      </header>
      {children}
    </motion.section>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl bg-deep p-4 shadow-[inset_0_1px_0_rgba(239,230,216,.05),inset_0_0_0_1px_rgba(150,95,50,.16)]", className)}>
      {children}
    </div>
  );
}

export function CardHead({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {meta && <span className="num text-[13px] text-zinc-600">{meta}</span>}
    </div>
  );
}

/* ---------- buttons ---------- */
export function Btn({
  kind = "tonal",
  small,
  className,
  children,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "tonal" | "quiet"; small?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-[transform,background-color,color] duration-150 ease-out active:scale-[.97] disabled:opacity-50 [&_svg]:size-4",
        small ? "h-9 px-3 text-[13.5px]" : "h-11 px-4 text-[15px]",
        kind === "primary" && "bg-amber text-[#2a1608] hover:bg-[#ff8640]",
        kind === "tonal" && "bg-sky/14 text-[#0f7a45] hover:bg-sky/22",
        kind === "quiet" && "px-2 text-zinc-600 hover:text-ink",
        className
      )}
      type="button"
      {...p}
    >
      {children}
    </button>
  );
}

export function IconBtn({ label, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      className="grid size-10 place-items-center rounded-xl text-zinc-600 transition-[transform,color,background-color] duration-150 hover:bg-ink/5 hover:text-sand active:scale-95 [&_svg]:size-5"
      type="button"
      {...p}
    >
      {children}
    </button>
  );
}

/* ---------- bits ---------- */
export function Thumb({ o, size = 40 }: { o?: { img?: string | null } | null; size?: number }) {
  if (!o?.img) return null;
  return <img alt="" className="shrink-0 rounded-xl object-cover" src={o.img} style={{ width: size, height: size }} />;
}

export function Meter({ label, value, target, unit = "", color }: { label: string; value: number; target: number; unit?: string; color: string }) {
  const pct = target ? Math.min(value / target, 1) : 0;
  const over = target > 0 && value > target;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-zinc-600">{label}</span>
        <span className="num">
          <b className={cn("font-semibold", over ? "text-bad" : "text-ink")}>{Math.round(value).toLocaleString("en-US")}</b>
          <span className="text-zinc-500"> / {target.toLocaleString("en-US")}{unit}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          className="h-full rounded-full"
          initial={false}
          style={{ background: over ? "var(--color-bad)" : color }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        />
      </div>
    </div>
  );
}

export function Check({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button aria-label={label} aria-pressed={on} className="grid size-10 shrink-0 place-items-center" onClick={onClick} type="button">
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full transition-[background-color,box-shadow] duration-200",
          on ? "bg-sky" : "shadow-[inset_0_0_0_1.5px_var(--color-slate)]"
        )}
      >
        <svg fill="none" height="13" viewBox="0 0 24 24" width="13">
          <motion.path
            animate={{ pathLength: on ? 1 : 0 }}
            d="m5 12.5 4.5 4.5L19 7.5"
            initial={false}
            stroke="#ffffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            transition={{ duration: 0.25 }}
          />
        </svg>
      </span>
    </button>
  );
}

export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1 py-1">
      <b className="text-[15px] font-semibold text-ink">{title}</b>
      <p className="mb-2 max-w-[36ch] text-[13.5px] text-zinc-600">{text}</p>
      {children}
    </div>
  );
}

/* ---------- forms ---------- */
const inputCls =
  "h-11 w-full min-w-0 rounded-xl bg-night px-3 text-[16px] text-ink shadow-[inset_0_0_0_1px_rgba(150,95,50,.26)] outline-none placeholder:text-zinc-500 focus:shadow-[inset_0_0_0_1.5px_var(--color-sky)]";
export function Field({ label, className, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("flex min-w-0 flex-1 flex-col gap-1.5 text-[12.5px] font-medium text-zinc-600", className)}>
      {label}
      <input className={inputCls} {...p} />
    </label>
  );
}
export function Select({ label, className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const sel = (
    <select className={cn(inputCls, "appearance-none pr-8", !label && className)} {...p}>
      {children}
    </select>
  );
  if (!label) return sel;
  return (
    <label className={cn("flex min-w-0 flex-1 flex-col gap-1.5 text-[12.5px] font-medium text-zinc-600", className)}>
      {label}
      {sel}
    </label>
  );
}
export function Area({ label, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-zinc-600">
      {label}
      <textarea className={cn(inputCls, "h-auto min-h-18 py-2.5")} {...p} />
    </label>
  );
}
export const numOrNull = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));

export function UnitSelect({ value, unit, onChange }: { value: "u" | "pack"; unit?: Unit; onChange: (v: "u" | "pack") => void }) {
  return (
    <Select aria-label="Unit" onChange={(e) => onChange(e.target.value as "u" | "pack")} value={value}>
      <option value="u">{unit ?? "g"}</option>
      <option value="pack">packs</option>
    </Select>
  );
}
export function ProductSelect({ products, value, onChange }: { products: Product[]; value: string; onChange: (id: string) => void }) {
  return (
    <Select aria-label="Grocery" onChange={(e) => onChange(e.target.value)} value={value}>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

/* ---------- sheet (vaul drawer) ---------- */
export function Sheet({ open, onClose, title, sub, children }: { open: boolean; onClose: () => void; title: string; sub?: string; children: ReactNode }) {
  return (
    <Drawer onOpenChange={(o) => !o && onClose()} open={open} repositionInputs={false}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-lg rounded-t-3xl border-0 shadow-[inset_0_1px_0_rgba(239,230,216,.08)] bg-deep">
        <div className="overflow-y-auto overscroll-contain px-5 pb-safe pt-3">
          <DrawerTitle className="font-display text-xl font-bold text-sand [font-stretch:110%]">{title}</DrawerTitle>
          <DrawerDescription className={cn("text-[13px] text-zinc-600", !sub && "sr-only")}>{sub ?? title}</DrawerDescription>
          <div className="mt-4 flex flex-col gap-4 pb-4">{children}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ---------- toast ---------- */
type ToastFn = (msg: string) => void;
let push: ToastFn = () => {};
export const toast: ToastFn = (m) => push(m);
export function Toaster() {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    push = (text) => {
      setMsg({ id: Date.now(), text });
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2400);
    };
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-5">
      <AnimatePresence>
        {msg && (
          <motion.div
            animate={{ y: 0, opacity: 1 }}
            className="rounded-xl bg-raise px-4 py-2.5 text-[14px] font-semibold text-ink shadow-[inset_0_0_0_1px_rgba(150,95,50,.2)]"
            exit={{ y: 10, opacity: 0, transition: { duration: 0.15 } }}
            initial={{ y: 12, opacity: 0 }}
            key={msg.id}
            role="status"
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
