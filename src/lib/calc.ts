export type Unit = "g" | "ml" | "pc";
export type Mode = "u" | "pack";
export type Slot = "Breakfast" | "Lunch" | "Dinner" | "Snack";
export const SLOTS: Slot[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export interface Product {
  id: string;
  name: string;
  emoji: string | null;
  img: string | null;
  unit: Unit;
  pack_size: number;
  price: number;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  stock: number | null;
}
export interface Item {
  product_id: string;
  qty: number;
  mode: Mode;
}
export interface Recipe {
  id: string;
  name: string;
  emoji: string | null;
  img: string | null;
  servings: number;
  cost_override: number | null;
  notes: string | null;
  recipe_items: (Item & { id?: string; position?: number })[];
}
export interface Meal {
  id: string;
  day: string;
  slot: Slot;
  name: string;
  recipe_id: string | null;
  servings: number;
  items: Item[];
  cost_override: number | null;
  eaten: boolean;
}
export interface Settings {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  budget: number;
}
export interface Totals {
  cost: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
}
export const DEFAULT_SETTINGS: Settings = { kcal: 2150, protein: 120, carbs: 260, fat: 70, budget: 156 };
export const unitLabel = (u?: Unit) => u ?? "g";

const zero = (): Totals => ({ cost: 0, kcal: 0, p: 0, c: 0, f: 0 });
const n = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? 0 : Number(v));
export const has = (v: unknown) => v != null && v !== "" && !Number.isNaN(Number(v));

export function units(it: Item, p?: Product) {
  if (!p) return 0;
  return it.mode === "pack" ? n(it.qty) * n(p.pack_size) : n(it.qty);
}

export function itemsTotals(items: Item[], products: Record<string, Product>): Totals {
  const t = zero();
  for (const it of items) {
    const p = products[it.product_id];
    if (!p) continue;
    const u = units(it, p);
    t.cost += (n(p.price) * u) / (n(p.pack_size) || 1);
    const k = p.unit === "pc" ? u : u / 100;
    t.kcal += n(p.kcal) * k;
    t.p += n(p.protein) * k;
    t.c += n(p.carbs) * k;
    t.f += n(p.fat) * k;
  }
  return t;
}

export function recipeTotals(r: Pick<Recipe, "recipe_items" | "servings" | "cost_override">, products: Record<string, Product>) {
  const total = itemsTotals(r.recipe_items, products);
  if (has(r.cost_override)) total.cost = n(r.cost_override);
  const s = Math.max(n(r.servings) || 1, 1);
  const per: Totals = { cost: total.cost / s, kcal: total.kcal / s, p: total.p / s, c: total.c / s, f: total.f / s };
  return { total, per };
}

export function mealTotals(m: Pick<Meal, "items" | "cost_override">, products: Record<string, Product>) {
  const t = itemsTotals(m.items, products);
  if (has(m.cost_override)) t.cost = n(m.cost_override);
  return t;
}

export function sumMeals(meals: Meal[], products: Record<string, Product>, onlyEaten = false) {
  const t = zero();
  for (const m of meals) {
    if (onlyEaten && !m.eaten) continue;
    const x = mealTotals(m, products);
    t.cost += x.cost;
    t.kcal += x.kcal;
    t.p += x.p;
    t.c += x.c;
    t.f += x.f;
  }
  return t;
}

/** Recipe items scaled to a number of servings, for a meal. */
export function scaleItems(r: Recipe, servings: number): Item[] {
  const k = (n(servings) || 1) / Math.max(n(r.servings) || 1, 1);
  return r.recipe_items.map((it) => ({ product_id: it.product_id, mode: it.mode, qty: Math.round(n(it.qty) * k * 1000) / 1000 }));
}

export function proteinPerPack(p: Product) {
  return p.unit === "pc" ? n(p.protein) * n(p.pack_size) : (n(p.protein) * n(p.pack_size)) / 100;
}
export function egpPer10gProtein(p: Product) {
  const pr = proteinPerPack(p);
  return pr > 0 ? n(p.price) / (pr / 10) : Infinity;
}

export const fmt = (v: number) => (Math.round((v || 0) * 10) / 10).toLocaleString("en-US");
export const r0 = (v: number) => Math.round(v || 0);

export const ds = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, k: number) => {
  const d = parseDay(s);
  d.setDate(d.getDate() + k);
  return ds(d);
};
export const today = () => ds(new Date());
export const weekStart = (s: string) => {
  const d = parseDay(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ds(d);
};
