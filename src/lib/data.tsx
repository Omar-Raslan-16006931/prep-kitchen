"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addDays, DEFAULT_SETTINGS, type Item, type Meal, type Product, type Recipe, type Settings, today } from "./calc";
import { supabase } from "./supabase";

interface PricePoint {
  product_id: string;
  price: number;
  changed_on: string;
}

interface Data {
  session: Session | null;
  ready: boolean;
  loading: boolean;
  error: string | null;
  products: Record<string, Product>;
  recipes: Record<string, Recipe>;
  meals: Meal[];
  settings: Settings;
  checks: Set<string>;
  history: PricePoint[];
  reload: () => Promise<void>;
  saveProduct: (p: Partial<Product> & { name: string }) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveRecipe: (r: Partial<Recipe> & { name: string; recipe_items: Item[] }) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  saveMeal: (m: Partial<Meal> & { day: string }) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  setEaten: (id: string, eaten: boolean) => Promise<void>;
  copyDay: (from: string, to: string) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
  toggleCheck: (productId: string) => Promise<void>;
  stockUp: (adds: { id: string; amount: number }[]) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Data | null>(null);
export const useData = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData outside provider");
  return v;
};

const toNum = <T extends object>(o: T, keys: (keyof T)[]) => {
  const out = { ...o };
  for (const k of keys) if (out[k] != null) (out[k] as unknown) = Number(out[k]);
  return out;
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [meals, setMeals] = useState<Meal[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [checks, setChecks] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<PricePoint[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const from = addDays(today(), -62);
    const to = addDays(today(), 62);
    const [p, r, m, s, c, h] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("recipes").select("*, recipe_items(product_id, qty, mode, position)").order("name"),
      supabase.from("meals").select("*").gte("day", from).lte("day", to).order("created_at"),
      supabase.from("settings").select("*").maybeSingle(),
      supabase.from("shop_checks").select("product_id"),
      supabase.from("price_history").select("product_id, price, changed_on").order("changed_on"),
    ]);
    const err = [p, r, m, s, c, h].find((x) => x.error)?.error;
    setError(err ? err.message : null);
    const pm: Record<string, Product> = {};
    for (const row of p.data ?? []) pm[row.id] = toNum(row as Product, ["pack_size", "price", "kcal", "protein", "carbs", "fat", "stock"]);
    setProducts(pm);
    const rm: Record<string, Recipe> = {};
    for (const row of (r.data ?? []) as Recipe[]) {
      rm[row.id] = {
        ...toNum(row, ["servings", "cost_override"]),
        recipe_items: [...(row.recipe_items ?? [])]
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((i) => ({ ...i, qty: Number(i.qty) })),
      };
    }
    setRecipes(rm);
    setMeals(((m.data ?? []) as Meal[]).map((x) => toNum(x, ["servings", "cost_override"])));
    if (s.data) setSettings(toNum(s.data as Settings, ["kcal", "protein", "carbs", "fat", "budget"]));
    setChecks(new Set((c.data ?? []).map((x: { product_id: string }) => x.product_id)));
    setHistory(((h.data ?? []) as PricePoint[]).map((x) => ({ ...x, price: Number(x.price) })));
    setLoading(false);
  }, [session]);

  useEffect(() => {
    reload();
    const onFocus = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [reload]);

  const must = (res: { error: { message: string } | null }) => {
    if (res.error) throw new Error(res.error.message);
  };

  const api = useMemo<Omit<Data, "session" | "ready" | "loading" | "error" | "products" | "recipes" | "meals" | "settings" | "checks" | "history" | "reload">>(
    () => ({
      async saveProduct(p) {
        const old = p.id ? products[p.id] : undefined;
        const row = { ...p };
        const res = p.id
          ? await supabase.from("products").update(row).eq("id", p.id).select("id").single()
          : await supabase.from("products").insert(row).select("id").single();
        must(res);
        if (!old || Number(old.price) !== Number(p.price)) {
          await supabase.from("price_history").insert({ product_id: res.data!.id, price: p.price ?? 0 });
        }
        await reload();
      },
      async deleteProduct(id) {
        must(await supabase.from("products").delete().eq("id", id));
        await reload();
      },
      async saveRecipe(r) {
        const { recipe_items, ...rest } = r;
        const res = r.id
          ? await supabase.from("recipes").update(rest).eq("id", r.id).select("id").single()
          : await supabase.from("recipes").insert(rest).select("id").single();
        must(res);
        const id = res.data!.id;
        must(await supabase.from("recipe_items").delete().eq("recipe_id", id));
        if (recipe_items.length)
          must(
            await supabase
              .from("recipe_items")
              .insert(recipe_items.map((i, k) => ({ recipe_id: id, product_id: i.product_id, qty: i.qty, mode: i.mode, position: k })))
          );
        await reload();
      },
      async deleteRecipe(id) {
        must(await supabase.from("recipes").delete().eq("id", id));
        await reload();
      },
      async saveMeal(m) {
        must(m.id ? await supabase.from("meals").update(m).eq("id", m.id) : await supabase.from("meals").insert(m));
        await reload();
      },
      async deleteMeal(id) {
        must(await supabase.from("meals").delete().eq("id", id));
        await reload();
      },
      async setEaten(id, eaten) {
        setMeals((ms) => ms.map((m) => (m.id === id ? { ...m, eaten } : m)));
        must(await supabase.from("meals").update({ eaten }).eq("id", id));
        // keep pantry stock in step with what was eaten
        const meal = meals.find((m) => m.id === id);
        if (meal) {
          for (const it of meal.items) {
            const p = products[it.product_id];
            if (!p || p.stock == null) continue;
            const u = it.mode === "pack" ? it.qty * p.pack_size : it.qty;
            const stock = Math.max(Math.round((p.stock + (eaten ? -u : u)) * 10) / 10, 0);
            await supabase.from("products").update({ stock }).eq("id", p.id);
          }
        }
        await reload();
      },
      async copyDay(from, to) {
        const rows = meals
          .filter((m) => m.day === from)
          .map(({ id: _id, ...m }) => ({ ...m, day: to, eaten: false }));
        if (rows.length) must(await supabase.from("meals").insert(rows));
        await reload();
      },
      async saveSettings(s) {
        must(await supabase.from("settings").upsert({ ...s, user_id: session!.user.id }));
        await reload();
      },
      async toggleCheck(productId) {
        const on = !checks.has(productId);
        setChecks((c) => {
          const n = new Set(c);
          if (on) n.add(productId);
          else n.delete(productId);
          return n;
        });
        must(
          on
            ? await supabase.from("shop_checks").insert({ product_id: productId })
            : await supabase.from("shop_checks").delete().eq("product_id", productId)
        );
      },
      async stockUp(adds) {
        for (const a of adds) {
          const p = products[a.id];
          if (!p) continue;
          await supabase.from("products").update({ stock: Math.round(((p.stock ?? 0) + a.amount) * 10) / 10 }).eq("id", a.id);
        }
        must(await supabase.from("shop_checks").delete().in("product_id", adds.map((a) => a.id)));
        await reload();
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [products, meals, checks, session, reload]
  );

  return (
    <Ctx.Provider value={{ session, ready, loading, error, products, recipes, meals, settings, checks, history, reload, ...api }}>
      {children}
    </Ctx.Provider>
  );
}
