"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import HoldButton from "@/components/kokonutui/hold-button";
import SpendingRing from "@/components/kokonutui/spending-ring";
import {
  addDays,
  egpPer10gProtein,
  fmt,
  has,
  type Item,
  itemsTotals,
  type Meal,
  mealTotals,
  type Product,
  parseDay,
  proteinPerPack,
  r0,
  type Recipe,
  recipeTotals,
  SLOTS,
  type Settings,
  type Slot,
  scaleItems,
  sumMeals,
  type Totals,
  today,
  type Unit,
} from "@/lib/calc";
import { useData } from "@/lib/data";
import { Area, Btn, Field, numOrNull, ProductSelect, Select, Sheet, toast, UnitSelect } from "./kit";

function TotalsRow({ t, label }: { t: Totals; label: string }) {
  const cells: [string, string, string?][] = [
    [fmt(t.cost), "EGP", "text-amber"],
    [fmt(r0(t.kcal)), "kcal"],
    [`${r0(t.p)}g`, "protein", "text-sky"],
    [`${r0(t.c)}g`, "carbs"],
    [`${r0(t.f)}g`, "fat"],
  ];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12.5px] font-semibold text-zinc-600">{label}</span>
      <div className="num grid grid-cols-5 rounded-xl bg-night py-2.5 shadow-[inset_0_0_0_1px_rgba(150,95,50,.2)]">
        {cells.map(([v, l, c]) => (
          <div className="text-center" key={l}>
            <b className={`block text-[15px] font-semibold ${c ?? "text-ink"}`}>{v}</b>
            <small className="text-[11px] text-zinc-600">{l}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemsEditor({ items, onChange }: { items: Item[]; onChange: (i: Item[]) => void }) {
  const { products } = useData();
  const list = Object.values(products);
  if (!list.length)
    return <p className="rounded-xl bg-amber/12 px-3 py-2.5 text-[13px] text-sand">Add groceries in Pantry first, then pick them here.</p>;
  const set = (k: number, patch: Partial<Item>) => onChange(items.map((it, i) => (i === k ? { ...it, ...patch } : it)));
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12.5px] font-semibold text-zinc-600">Ingredients</span>
      {items.map((it, k) => (
        <div className="grid grid-cols-[minmax(0,1fr)_68px_84px_36px] items-center gap-1.5" key={k}>
          <ProductSelect onChange={(id) => set(k, { product_id: id })} products={list} value={it.product_id} />
          <input
            aria-label="Amount"
            className="h-11 w-full min-w-0 rounded-xl bg-night px-3 text-ink shadow-[inset_0_0_0_1px_rgba(150,95,50,.26)] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-sky)]"
            inputMode="decimal"
            onChange={(e) => set(k, { qty: Number(e.target.value) })}
            type="number"
            value={Number.isFinite(it.qty) ? it.qty : ""}
          />
          <UnitSelect onChange={(mode) => set(k, { mode })} unit={products[it.product_id]?.unit} value={it.mode} />
          <button aria-label="Remove ingredient" className="grid size-9 place-items-center rounded-lg text-zinc-500 hover:text-ink" onClick={() => onChange(items.filter((_, i) => i !== k))} type="button">
            <X className="size-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Btn onClick={() => onChange([...items, { product_id: list[0].id, qty: 100, mode: "u" }])} small>
          <Plus /> Ingredient
        </Btn>
        <span className="text-[12.5px] text-zinc-500">Grams, or packs (0.5 = half)</span>
      </div>
    </div>
  );
}

function Look({ img }: { img?: string | null; emoji?: string | null; onEmoji?: (v: string) => void }) {
  if (!img) return null;
  return <img alt="" className="aspect-[4/3] w-full rounded-xl object-cover" src={img} />;
}

function Delete({ label, onDone }: { label: string; onDone: () => void }) {
  return (
    <div className="flex justify-center pt-1">
      <HoldButton completeLabel="Deleted" holdDuration={900} onHoldComplete={onDone} variant="red">
        {label}
      </HoldButton>
    </div>
  );
}

/* ---------- product ---------- */
export function ProductSheet({ id, open, onClose }: { id?: string; open: boolean; onClose: () => void }) {
  const { products, history, saveProduct, deleteProduct } = useData();
  const blank = { name: "", emoji: "", unit: "g" as Unit, pack_size: "1000", price: "", kcal: "", protein: "", carbs: "", fat: "", stock: "" };
  const [d, setD] = useState(blank);
  useEffect(() => {
    if (!open) return;
    const p = id ? products[id] : undefined;
    setD(
      p
        ? { name: p.name, emoji: p.emoji ?? "", unit: p.unit, pack_size: String(p.pack_size), price: String(p.price), kcal: p.kcal?.toString() ?? "", protein: p.protein?.toString() ?? "", carbs: p.carbs?.toString() ?? "", fat: p.fat?.toString() ?? "", stock: p.stock?.toString() ?? "" }
        : blank
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id]);
  const preview: Product = { id: "x", name: d.name, emoji: null, img: null, unit: d.unit, pack_size: Number(d.pack_size) || 0, price: Number(d.price) || 0, kcal: numOrNull(d.kcal), protein: numOrNull(d.protein), carbs: numOrNull(d.carbs), fat: numOrNull(d.fat), stock: null };
  const pp = proteinPerPack(preview);
  const hist = history.filter((h) => h.product_id === id);
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  const save = async () => {
    if (!d.name.trim()) return toast("Add a name first");
    try {
      await saveProduct({ id, name: d.name.trim(), emoji: d.emoji || null, unit: d.unit, pack_size: Number(d.pack_size) || 0, price: Number(d.price) || 0, kcal: numOrNull(d.kcal), protein: numOrNull(d.protein), carbs: numOrNull(d.carbs), fat: numOrNull(d.fat), stock: numOrNull(d.stock) });
      toast(id ? "Saved" : "Grocery added");
      onClose();
    } catch (e) {
      toast(`Couldn't save: ${(e as Error).message}`);
    }
  };
  return (
    <Sheet onClose={onClose} open={open} title={id ? "Edit grocery" : "Add a grocery"}>
      <Look emoji={d.emoji} img={id ? products[id]?.img : null} onEmoji={(v) => setD({ ...d, emoji: v })} />
      <Field label="Name" onChange={set("name")} placeholder="e.g. Chicken breast" value={d.name} />
      <div className="flex gap-2">
        <Field inputMode="decimal" label="Pack size" onChange={set("pack_size")} type="number" value={d.pack_size} />
        <Select label="Unit" onChange={set("unit")} value={d.unit}>
          <option value="g">grams</option>
          <option value="ml">ml</option>
          <option value="pc">pieces</option>
        </Select>
        <Field inputMode="decimal" label="Price, EGP" onChange={set("price")} type="number" value={d.price} />
      </div>
      <span className="-mb-2 text-[12.5px] font-semibold text-zinc-600">Macros {d.unit === "pc" ? "per piece" : `per 100${d.unit}`}, from the label</span>
      <div className="grid grid-cols-4 gap-2">
        <Field inputMode="decimal" label="kcal" onChange={set("kcal")} type="number" value={d.kcal} />
        <Field inputMode="decimal" label="Protein" onChange={set("protein")} type="number" value={d.protein} />
        <Field inputMode="decimal" label="Carbs" onChange={set("carbs")} type="number" value={d.carbs} />
        <Field inputMode="decimal" label="Fat" onChange={set("fat")} type="number" value={d.fat} />
      </div>
      <Field inputMode="decimal" label={`At home now (${d.unit}), optional`} onChange={set("stock")} placeholder="Leave empty to skip" type="number" value={d.stock} />
      <div className="num flex flex-col gap-1.5 rounded-xl bg-night px-3.5 py-3 text-[13.5px] shadow-[inset_0_0_0_1px_rgba(150,95,50,.2)]">
        <div className="flex justify-between"><span className="text-zinc-600">Protein in one pack</span><b className="font-semibold">{r0(pp)}g</b></div>
        <div className="flex justify-between"><span className="text-zinc-600">Cost per 10g protein</span><b className="font-semibold">{pp > 0 ? `${fmt(egpPer10gProtein(preview))} EGP` : "n/a"}</b></div>
        {hist.length > 1 && (
          <div className="flex justify-between gap-3"><span className="text-zinc-600">Price history</span><span>{hist.slice(-4).map((h) => fmt(h.price)).join(" → ")} EGP</span></div>
        )}
      </div>
      <Btn kind="primary" onClick={save}>{id ? "Save" : "Add grocery"}</Btn>
      {id && <Delete label="Hold to delete" onDone={async () => { await deleteProduct(id); toast("Deleted"); onClose(); }} />}
    </Sheet>
  );
}

/* ---------- recipe ---------- */
export function RecipeSheet({ id, open, onClose, onPlan }: { id?: string; open: boolean; onClose: () => void; onPlan: (recipeId: string) => void }) {
  const { products, recipes, saveRecipe, deleteRecipe } = useData();
  const [d, setD] = useState({ name: "", emoji: "", servings: "4", cost: "", notes: "" });
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    if (!open) return;
    const r = id ? recipes[id] : undefined;
    setD(r ? { name: r.name, emoji: r.emoji ?? "", servings: String(r.servings), cost: r.cost_override?.toString() ?? "", notes: r.notes ?? "" } : { name: "", emoji: "", servings: "4", cost: "", notes: "" });
    setItems(r ? r.recipe_items.map(({ product_id, qty, mode }) => ({ product_id, qty, mode })) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id]);
  const { total, per } = recipeTotals({ recipe_items: items, servings: Number(d.servings) || 1, cost_override: numOrNull(d.cost) }, products);
  const save = async () => {
    if (!d.name.trim()) return toast("Add a name first");
    if (!items.length) return toast("Add at least one ingredient");
    try {
      await saveRecipe({ id, name: d.name.trim(), emoji: d.emoji || null, servings: Number(d.servings) || 1, cost_override: numOrNull(d.cost), notes: d.notes || null, recipe_items: items });
      toast(id ? "Saved" : "Recipe saved");
      onClose();
    } catch (e) {
      toast(`Couldn't save: ${(e as Error).message}`);
    }
  };
  return (
    <Sheet onClose={onClose} open={open} title={id ? "Edit recipe" : "New recipe"}>
      <Look emoji={d.emoji} img={id ? recipes[id]?.img : null} onEmoji={(v) => setD({ ...d, emoji: v })} />
      <Field label="Name" onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Chicken rice bowls" value={d.name} />
      <div className="flex gap-2">
        <Field inputMode="numeric" label="Makes (servings)" onChange={(e) => setD({ ...d, servings: e.target.value })} type="number" value={d.servings} />
        <Field inputMode="decimal" label="Batch cost, EGP" onChange={(e) => setD({ ...d, cost: e.target.value })} placeholder="Auto" type="number" value={d.cost} />
      </div>
      <ItemsEditor items={items} onChange={setItems} />
      <TotalsRow label="One serving" t={per} />
      <p className="num -mt-2 text-[12.5px] text-zinc-500">Whole batch: {fmt(total.cost)} EGP · {fmt(r0(total.kcal))} kcal · {r0(total.p)}g protein</p>
      <Area label="Notes, optional" onChange={(e) => setD({ ...d, notes: e.target.value })} placeholder="Steps, timings, tips" rows={2} value={d.notes} />
      <Btn kind="primary" onClick={save}>{id ? "Save" : "Save recipe"}</Btn>
      {id && (
        <>
          <Btn onClick={() => onPlan(id)}><Plus /> Add to a day</Btn>
          <Delete label="Hold to delete" onDone={async () => { await deleteRecipe(id); toast("Deleted"); onClose(); }} />
        </>
      )}
    </Sheet>
  );
}

/* ---------- meal ---------- */
export function MealSheet({ id, day, recipeId, open, onClose }: { id?: string; day: string; recipeId?: string; open: boolean; onClose: () => void }) {
  const { products, recipes, meals, saveMeal, deleteMeal } = useData();
  const [d, setD] = useState<{ recipe_id: string; name: string; slot: Slot; servings: string; cost: string }>({ recipe_id: "", name: "", slot: "Lunch", servings: "1", cost: "" });
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    if (!open) return;
    const m = id ? meals.find((x) => x.id === id) : undefined;
    if (m) {
      setD({ recipe_id: m.recipe_id ?? "", name: m.name, slot: m.slot, servings: String(m.servings), cost: m.cost_override?.toString() ?? "" });
      setItems(m.items);
    } else {
      const r = recipeId ? recipes[recipeId] : undefined;
      setD({ recipe_id: r?.id ?? "", name: r?.name ?? "", slot: "Lunch", servings: "1", cost: "" });
      setItems(r ? scaleItems(r, 1) : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id, recipeId]);
  const pickRecipe = (rid: string) => {
    const r = recipes[rid];
    setD({ ...d, recipe_id: rid, name: r?.name ?? d.name, servings: "1" });
    setItems(r ? scaleItems(r, 1) : []);
  };
  const setServings = (v: string) => {
    setD({ ...d, servings: v });
    const r = recipes[d.recipe_id];
    if (r) setItems(scaleItems(r, Number(v) || 1));
  };
  const t = mealTotals({ items, cost_override: numOrNull(d.cost) }, products);
  const save = async () => {
    if (!items.length) return toast("Pick a recipe or add an ingredient");
    try {
      await saveMeal({ id, day, slot: d.slot, name: d.name.trim() || "Meal", recipe_id: d.recipe_id || null, servings: Number(d.servings) || 1, items, cost_override: numOrNull(d.cost) });
      toast(id ? "Saved" : "Meal added");
      onClose();
    } catch (e) {
      toast(`Couldn't save: ${(e as Error).message}`);
    }
  };
  return (
    <Sheet onClose={onClose} open={open} sub={parseDay(day).toLocaleString("en", { weekday: "long", day: "numeric", month: "short" })} title={id ? "Edit meal" : "Add a meal"}>
      {!id && (
        <Select label="Recipe" onChange={(e) => pickRecipe(e.target.value)} value={d.recipe_id}>
          <option value="">None, I&apos;ll pick ingredients</option>
          {Object.values(recipes).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </Select>
      )}
      <div className="flex gap-2">
        <Select label="Meal" onChange={(e) => setD({ ...d, slot: e.target.value as Slot })} value={d.slot}>
          {SLOTS.map((s) => <option key={s}>{s}</option>)}
        </Select>
        {d.recipe_id ? (
          <Field inputMode="decimal" label="Servings" onChange={(e) => setServings(e.target.value)} type="number" value={d.servings} />
        ) : (
          <Field label="Name" onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Lunch box" value={d.name} />
        )}
      </div>
      <ItemsEditor items={items} onChange={setItems} />
      <p className="-mt-2 text-[12.5px] text-zinc-500">Changing amounts here only affects this meal.</p>
      <TotalsRow label="This meal" t={t} />
      <Btn kind="primary" onClick={save}>{id ? "Save" : "Add meal"}</Btn>
      {id && <Delete label="Hold to remove" onDone={async () => { await deleteMeal(id); toast("Removed"); onClose(); }} />}
    </Sheet>
  );
}

/* ---------- targets ---------- */
export function TargetsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, saveSettings, signOut, session } = useData();
  const [d, setD] = useState<Record<keyof Settings, string>>({ kcal: "", protein: "", carbs: "", fat: "", budget: "" });
  useEffect(() => {
    if (open) setD({ kcal: String(settings.kcal), protein: String(settings.protein), carbs: String(settings.carbs), fat: String(settings.fat), budget: String(settings.budget) });
  }, [open, settings]);
  const f = (k: keyof Settings, label: string) => <Field inputMode="decimal" label={label} onChange={(e) => setD({ ...d, [k]: e.target.value })} type="number" value={d[k]} />;
  return (
    <Sheet onClose={onClose} open={open} sub="Set for 75 kg, 178 cm, no training, keeping weight steady" title="Daily targets">
      <div className="flex gap-2">{f("kcal", "Calories")}{f("protein", "Protein, g")}</div>
      <div className="flex gap-2">{f("carbs", "Carbs, g")}{f("fat", "Fat, g")}</div>
      {f("budget", "Food budget a day, EGP")}
      <Btn
        kind="primary"
        onClick={async () => {
          try {
            await saveSettings({ kcal: Number(d.kcal) || 0, protein: Number(d.protein) || 0, carbs: Number(d.carbs) || 0, fat: Number(d.fat) || 0, budget: Number(d.budget) || 0 });
            toast("Targets saved");
            onClose();
          } catch (e) {
            toast(`Couldn't save: ${(e as Error).message}`);
          }
        }}
      >
        Save targets
      </Btn>
      <div className="flex items-center justify-between pt-2 text-[13px] text-zinc-500">
        <span className="truncate">{session?.user.email}</span>
        <Btn kind="quiet" onClick={signOut} small>Sign out</Btn>
      </div>
    </Sheet>
  );
}

/* ---------- stats ---------- */
const RING = [
  ["stroke-[#ff6b1a]", "bg-[#ff6b1a]"],
  ["stroke-[#f5b400]", "bg-[#f5b400]"],
  ["stroke-[#1fa463]", "bg-[#1fa463]"],
  ["stroke-[#e8436f]", "bg-[#e8436f]"],
  ["stroke-[#c9a78a]", "bg-[#c9a78a]"],
] as const;
export function StatsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { meals, products, recipes, settings } = useData();
  const t0 = today();
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(t0, i - 13)), [t0]);
  const byDay = days.map((dd) => sumMeals(meals.filter((m) => m.day === dd), products, true));
  const max = Math.max(settings.budget || 1, ...byDay.map((x) => x.cost));
  const logged = byDay.filter((x) => x.kcal > 0);
  const avg = (k: keyof Totals) => (logged.length ? logged.reduce((a, x) => a + x[k], 0) / logged.length : 0);
  const month = sumMeals(meals.filter((m) => m.day.startsWith(t0.slice(0, 7))), products, true).cost;
  // where this month's food money went, by recipe
  const spend: Record<string, number> = {};
  for (const m of meals) {
    if (!m.eaten || !m.day.startsWith(t0.slice(0, 7))) continue;
    const key = (m.recipe_id && recipes[m.recipe_id]?.name) || "Other meals";
    spend[key] = (spend[key] ?? 0) + mealTotals(m, products).cost;
  }
  const cats = Object.entries(spend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount], i) => ({ name, amount: Math.round(amount * 10) / 10, stroke: RING[i][0], dot: RING[i][1] }));
  return (
    <Sheet onClose={onClose} open={open} sub="From the meals you ticked as eaten" title="Your numbers">
      <div>
        <div aria-label="Food spend per day, last 14 days" className="flex h-28 items-end gap-1" role="img">
          {byDay.map((x, i) => (
            <div className="relative h-full flex-1 overflow-hidden rounded-md bg-zinc-200/50" key={days[i]} title={`${fmt(x.cost)} EGP`}>
              <div
                className={`absolute inset-x-0 bottom-0 rounded-md ${x.cost > settings.budget ? "bg-amber" : "bg-sky"}`}
                style={{ height: `${(x.cost / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="num mt-1.5 flex justify-between text-[12px] text-zinc-500">
          <span>{parseDay(days[0]).toLocaleString("en", { day: "numeric", month: "short" })}</span>
          <span>amber = over {fmt(settings.budget)} EGP</span>
          <span>today</span>
        </div>
      </div>
      <div className="num flex flex-col gap-1.5 rounded-xl bg-night px-3.5 py-3 text-[13.5px] shadow-[inset_0_0_0_1px_rgba(150,95,50,.2)]">
        {[
          ["Spent this month", `${fmt(month)} EGP`],
          ["Average a day", `${fmt(avg("cost"))} EGP`],
          ["Average calories", `${fmt(r0(avg("kcal")))} of ${fmt(settings.kcal)}`],
          ["Average protein", `${r0(avg("p"))}g of ${settings.protein}g`],
          ["Days logged", `${logged.length} of 14`],
        ].map(([a, b]) => (
          <div className="flex justify-between" key={a}><span className="text-zinc-600">{a}</span><b className="font-semibold">{b}</b></div>
        ))}
      </div>
      {cats.length > 0 && <SpendingRing categories={cats} className="w-full max-w-none" currency="EGP" title="This month by meal" />}
    </Sheet>
  );
}

export { itemsTotals, has };
export type { Meal, Recipe };
