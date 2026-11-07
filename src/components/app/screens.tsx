"use client";

import { ChartNoAxesColumn, ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import ParticleButton from "@/components/kokonutui/particle-button";
import SmoothTab from "@/components/kokonutui/smooth-tab";
import {
  addDays,
  egpPer10gProtein,
  fmt,
  type Meal,
  mealTotals,
  parseDay,
  type Product,
  r0,
  recipeTotals,
  SLOTS,
  sumMeals,
  today,
  units,
  weekStart,
} from "@/lib/calc";
import { useData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Btn, Card, CardHead, Check, Empty, IconBtn, Meter, Page, Thumb, toast } from "./kit";

export type Open =
  | { kind: "product"; id?: string }
  | { kind: "recipe"; id?: string }
  | { kind: "meal"; day: string; id?: string; recipeId?: string }
  | { kind: "targets" }
  | { kind: "stats" };

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayLabel = (d: string) => parseDay(d).toLocaleString("en", { weekday: "long", day: "numeric" });

function MealRow({ m, open }: { m: Meal; open: (o: Open) => void }) {
  const { products, recipes, setEaten } = useData();
  const t = mealTotals(m, products);
  const r = m.recipe_id ? recipes[m.recipe_id] : null;
  return (
    <div className="flex min-h-14 items-center gap-1">
      <Check label={m.eaten ? "Eaten, tap to undo" : "Mark as eaten"} on={m.eaten} onClick={() => setEaten(m.id, !m.eaten)} />
      <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1.5 text-left transition-colors hover:bg-ink/[.03]" onClick={() => open({ kind: "meal", day: m.day, id: m.id })} type="button">
        <Thumb o={r ?? null} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-semibold", m.eaten ? "text-zinc-600" : "text-ink")}>{m.name}</span>
          <span className="num block text-[12.5px] text-zinc-600">
            {fmt(r0(t.kcal))} kcal · {r0(t.p)}g protein · {fmt(t.cost)} EGP
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-zinc-400" />
      </button>
    </div>
  );
}

function DayMeals({ day, open }: { day: string; open: (o: Open) => void }) {
  const { meals } = useData();
  const list = meals.filter((m) => m.day === day);
  if (!list.length)
    return (
      <Empty text="Pick a recipe or put together a quick meal from your groceries." title="No meals yet">
        <Btn onClick={() => open({ kind: "meal", day })} small>
          <Plus /> Add a meal
        </Btn>
      </Empty>
    );
  return (
    <div className="flex flex-col">
      {SLOTS.map((s) => {
        const xs = list.filter((m) => m.slot === s);
        if (!xs.length) return null;
        return (
          <div key={s}>
            <p className="mt-1 text-[12px] font-semibold text-zinc-500">{s}</p>
            {xs.map((m) => (
              <MealRow key={m.id} m={m} open={open} />
            ))}
          </div>
        );
      })}
      <div className="mt-2">
        <Btn onClick={() => open({ kind: "meal", day })} small>
          <Plus /> Add a meal
        </Btn>
      </div>
    </div>
  );
}

/* ---------- Today ---------- */
export function Today({ open, go }: { open: (o: Open) => void; go: (t: string) => void }) {
  const { meals, products, recipes, settings, setEaten } = useData();
  const t = today();
  const todays = meals.filter((m) => m.day === t);
  const eaten = sumMeals(todays, products, true);
  const left = settings.budget - eaten.cost;
  const next = [...todays].filter((m) => !m.eaten).sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot))[0];
  const hasP = Object.keys(products).length > 0;
  const hasR = Object.keys(recipes).length > 0;
  const hasM = meals.length > 0;
  const steps = [
    { done: hasP, t: "Add your groceries", s: "Price, pack size and macros", go: () => (hasP ? go("pantry") : open({ kind: "product" })) },
    { done: hasR, t: "Make a recipe", s: "Built from your groceries", go: () => (hasR ? go("recipes") : open({ kind: "recipe" })) },
    { done: hasM, t: "Plan a meal", s: "Pick a recipe for today", go: () => open({ kind: "meal", day: t }) },
  ];
  const cur = steps.findIndex((s) => !s.done);
  const now = new Date();
  return (
    <Page
      action={
        <div className="flex">
          <IconBtn label="Your numbers" onClick={() => open({ kind: "stats" })}>
            <ChartNoAxesColumn />
          </IconBtn>
          <IconBtn label="Daily targets" onClick={() => open({ kind: "targets" })}>
            <SlidersHorizontal />
          </IconBtn>
        </div>
      }
      sub={now.toLocaleString("en", { day: "numeric", month: "long" })}
      title={now.toLocaleString("en", { weekday: "long" })}
    >
      {cur !== -1 && (
        <Card>
          <CardHead meta={`${steps.filter((s) => s.done).length} of 3 done`} title="Get set up" />
          <div className="flex flex-col divide-y divide-zinc-200">
            {steps.map((s, i) => (
              <button className="flex min-h-14 items-center gap-3 py-2.5 text-left" key={s.t} onClick={s.go} type="button">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold",
                    s.done ? "bg-sky text-[#ffffff]" : i === cur ? "text-amber shadow-[inset_0_0_0_1.5px_var(--color-amber)]" : "text-zinc-500 shadow-[inset_0_0_0_1.5px_var(--color-slate)]"
                  )}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block font-semibold", s.done && "text-zinc-600")}>{s.t}</span>
                  <span className="block text-[13px] text-zinc-500">{s.done ? "Done" : s.s}</span>
                </span>
                <ChevronRight className="size-4 text-zinc-400" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {next && (
        <Card className="flex items-center gap-3">
          <Thumb o={next.recipe_id ? recipes[next.recipe_id] : null} size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-zinc-600">Up next · {next.slot}</p>
            <p className="truncate text-[16px] font-semibold">{next.name}</p>
            <p className="num text-[12.5px] text-zinc-600">
              {fmt(r0(mealTotals(next, products).kcal))} kcal · {r0(mealTotals(next, products).p)}g protein
            </p>
          </div>
          <ParticleButton
            className="h-9 rounded-xl bg-amber px-3.5 text-[13.5px] font-semibold text-[#2a1608] hover:bg-[#ff8640] dark:bg-amber dark:text-[#2a1608] dark:hover:bg-[#ff8640]"
            onClick={() => setEaten(next.id, true)}
            pendingLabel="Logging"
            successLabel="Logged"
          >
            I ate it
          </ParticleButton>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className={cn("num font-display text-[36px] font-bold leading-none [font-stretch:120%]", left < 0 ? "text-bad" : "text-sand")}>{fmt(left)}</p>
            <p className="mt-1 text-[13px] text-zinc-600">EGP left for food today</p>
          </div>
          <p className="num text-right text-[13px] text-zinc-600">
            spent {fmt(eaten.cost)}
            <br />
            of {fmt(settings.budget)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
          <Meter color="var(--color-amber)" label="Calories" target={settings.kcal} value={eaten.kcal} />
          <Meter color="var(--color-sky)" label="Protein" target={settings.protein} unit="g" value={eaten.p} />
          <Meter color="#f5b400" label="Carbs" target={settings.carbs} unit="g" value={eaten.c} />
          <Meter color="#e8436f" label="Fat" target={settings.fat} unit="g" value={eaten.f} />
        </div>
      </Card>

      <Card>
        <CardHead meta={todays.length ? `${todays.filter((m) => m.eaten).length} of ${todays.length} eaten` : undefined} title="Today's meals" />
        <DayMeals day={t} open={open} />
      </Card>
    </Page>
  );
}

/* ---------- Plan ---------- */
export function Plan({ open }: { open: (o: Open) => void }) {
  const { meals, products, settings, copyDay } = useData();
  const [day, setDay] = useState(today());
  const ws = weekStart(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const week = sumMeals(meals.filter((m) => days.includes(m.day)), products);
  const dt = sumMeals(meals.filter((m) => m.day === day), products);
  const hasMeals = meals.some((m) => m.day === day);
  return (
    <Page
      action={
        <div className="flex">
          <IconBtn label="Previous week" onClick={() => setDay(addDays(day, -7))}>
            <ChevronLeft />
          </IconBtn>
          <IconBtn label="Next week" onClick={() => setDay(addDays(day, 7))}>
            <ChevronRight />
          </IconBtn>
        </div>
      }
      sub={`${parseDay(ws).toLocaleString("en", { month: "short", day: "numeric" })} to ${parseDay(days[6]).toLocaleString("en", { month: "short", day: "numeric" })} · ${fmt(week.cost)} EGP planned`}
      title="Plan"
    >
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const k = sumMeals(meals.filter((m) => m.day === d), products).kcal;
          const on = d === day;
          return (
            <button
              aria-label={`${dayLabel(d)}, ${r0(k)} kcal planned`}
              aria-pressed={on}
              className={cn(
                "flex min-h-16 flex-col items-center gap-0.5 rounded-xl py-2 text-[11.5px] transition-colors",
                on ? "bg-raise text-zinc-700 shadow-[inset_0_0_0_1px_rgba(150,95,50,.2)]" : "text-zinc-500"
              )}
              key={d}
              onClick={() => setDay(d)}
              type="button"
            >
              {DOW[parseDay(d).getDay()]}
              <b className={cn("num text-[16px] font-semibold", on ? "text-sand" : d === today() ? "text-sky" : "text-ink")}>{parseDay(d).getDate()}</b>
              <span className="mt-1 h-[3px] w-1/2 overflow-hidden rounded-full bg-zinc-200">
                <span className="block h-full rounded-full bg-sky" style={{ width: `${Math.min((k / (settings.kcal || 1)) * 100, 100)}%` }} />
              </span>
            </button>
          );
        })}
      </div>
      <Card>
        <CardHead meta={hasMeals ? `${fmt(r0(dt.kcal))} kcal · ${r0(dt.p)}g P · ${fmt(dt.cost)} EGP` : undefined} title={day === today() ? "Today" : dayLabel(day)} />
        <DayMeals day={day} open={open} />
        {hasMeals && (
          <div className="mt-1 flex justify-end">
            <Btn
              kind="quiet"
              onClick={async () => {
                await copyDay(day, addDays(day, 1));
                setDay(addDays(day, 1));
                toast(`Copied to ${parseDay(addDays(day, 1)).toLocaleString("en", { weekday: "long" })}`);
              }}
              small
            >
              Copy to next day
            </Btn>
          </div>
        )}
      </Card>
    </Page>
  );
}

/* ---------- Recipes ---------- */
export function Recipes({ open }: { open: (o: Open) => void }) {
  const { recipes, products } = useData();
  const list = Object.values(recipes);
  const hasP = Object.keys(products).length > 0;
  return (
    <Page
      action={
        list.length ? (
          <Btn onClick={() => open({ kind: "recipe" })} small>
            <Plus /> New
          </Btn>
        ) : undefined
      }
      sub={list.length ? `${list.length} saved · prices per serving` : "Build meals from your groceries"}
      title="Recipes"
    >
      {list.length ? (
        <div className="grid grid-cols-2 gap-3">
          {list.map((r) => {
            const { per } = recipeTotals(r, products);
            return (
              <button className="flex flex-col gap-2 rounded-2xl bg-deep p-3 text-left shadow-[inset_0_0_0_1px_rgba(150,95,50,.16)] transition-transform duration-150 active:scale-[.97]" key={r.id} onClick={() => open({ kind: "recipe", id: r.id })} type="button">
                {r.img && <img alt="" className="aspect-[4/3] w-full rounded-xl object-cover" src={r.img} />}
                <span className="block text-[14.5px] font-semibold leading-snug">{r.name}</span>
                <span className="num flex flex-col text-[12.5px] text-zinc-600">
                  <span><b className="font-semibold text-amber">{fmt(per.cost)} EGP</b> a serving</span>
                  <span>{r0(per.p)}g protein · {fmt(r0(per.kcal))} kcal</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Card>
          <Empty
            text={hasP ? "Pick groceries and amounts. The cost and macros are worked out for you." : "Add a few groceries in Pantry first, then build a recipe from them."}
            title="No recipes yet"
          >
            <Btn onClick={() => open({ kind: hasP ? "recipe" : "product" })} small>
              <Plus /> {hasP ? "New recipe" : "Add groceries"}
            </Btn>
          </Empty>
        </Card>
      )}
    </Page>
  );
}

/* ---------- Pantry ---------- */
function splitName(full: string) {
  const m = full.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) return { title: full, store: null as string | null, promo: false };
  const parts = m[2].split(",").map((s) => s.trim());
  return { title: m[1], store: parts.filter((s) => s !== "promo").join(", ") || null, promo: parts.includes("promo") };
}

function Tile({ p, title }: { p: Product; title: string }) {
  if (p.img) return <img alt="" className="size-12 shrink-0 rounded-xl bg-raise object-cover" src={p.img} />;
  return <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-raise text-[16px] font-bold text-amber">{title.charAt(0).toUpperCase()}</span>;
}

function StoreChip({ store }: { store: string }) {
  const mart = /mart/i.test(store);
  return (
    <span className={cn("shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none", mart ? "bg-amber/15 text-[#c24d00]" : "bg-[#1d6fe0]/12 text-[#1d6fe0]")}>{store}</span>
  );
}

function ProductRow({ p, rank, best, open }: { p: Product; rank?: number; best?: number; open: (o: Open) => void }) {
  const low = p.stock != null && p.stock < p.pack_size * 0.25;
  const per = egpPer10gProtein(p);
  const { title, store, promo } = splitName(p.name);
  return (
    <button className="flex min-h-[68px] w-full items-center gap-3 py-2.5 text-left" onClick={() => open({ kind: "product", id: p.id })} type="button">
      {rank != null && <span className={cn("w-4 text-center text-[13px] font-bold", rank === 1 ? "text-amber" : "text-zinc-400")}>{rank}</span>}
      <Tile p={p} title={title} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] font-semibold leading-tight text-ink">{title}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[12px] text-zinc-600">
          {store && <StoreChip store={store.replace("Talabat Mart", "Mart")} />}
          {promo && <span className="shrink-0 rounded-md bg-bad/10 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-bad">promo</span>}
          <span className="num truncate">
            {rank != null ? `${fmt(p.price)} EGP` : `${fmt(p.protein ?? 0)}g protein`}
            {p.stock != null && <span className={low ? "text-bad" : ""}> · {fmt(p.stock)}{p.unit} left</span>}
          </span>
        </span>
        {rank != null && best != null && (
          <span className="mt-1.5 block h-[3px] max-w-40 overflow-hidden rounded-full bg-zinc-200">
            <span className="block h-full rounded-full bg-amber" style={{ width: `${Math.max((best / per) * 100, 6)}%` }} />
          </span>
        )}
      </span>
      <span className="num shrink-0 whitespace-nowrap text-right text-[12px] text-zinc-600">
        <b className="block text-[15.5px] font-bold text-ink">{rank != null ? fmt(per) : fmt(p.price)}</b>
        {rank != null ? "EGP / 10g" : `EGP · ${fmt(p.pack_size)}${p.unit}`}
      </span>
    </button>
  );
}

/* only foods that are really protein sources get ranked */
const isProteinFood = (p: Product) => (p.unit === "pc" ? (p.protein ?? 0) >= 5 : (p.protein ?? 0) >= 15);

export function Pantry({ open }: { open: (o: Open) => void }) {
  const { products } = useData();
  const [q, setQ] = useState("");
  const all = Object.values(products);
  const shown = all.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const ranked = shown.filter((p) => isProteinFood(p) && Number.isFinite(egpPer10gProtein(p))).sort((a, b) => egpPer10gProtein(a) - egpPer10gProtein(b));
  const low = all.filter((p) => p.stock != null && p.stock < p.pack_size * 0.25).length;
  const list = (ps: Product[], rank: boolean) =>
    ps.length ? (
      <div className="flex flex-col divide-y divide-zinc-200">
        {ps.map((p, i) => (
          <ProductRow best={rank ? egpPer10gProtein(ranked[0]) : undefined} key={p.id} open={open} p={p} rank={rank ? i + 1 : undefined} />
        ))}
      </div>
    ) : (
      <p className="py-3 text-[13.5px] text-zinc-600">{rank ? "Add protein to your groceries to rank them." : `Nothing matches ${q}.`}</p>
    );
  return (
    <Page
      action={
        all.length ? (
          <Btn onClick={() => open({ kind: "product" })} small>
            <Plus /> Add
          </Btn>
        ) : undefined
      }
      sub={all.length ? `${all.length} groceries${low ? ` · ${low} running low` : ""}` : "Your groceries, prices and macros"}
      title="Pantry"
    >
      {all.length ? (
        <>
          <label className="flex h-11 items-center gap-2 rounded-xl bg-deep px-3 text-zinc-500 shadow-[inset_0_0_0_1px_rgba(150,95,50,.16)]">
            <Search className="size-4" />
            <input aria-label="Search groceries" className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-zinc-500" onChange={(e) => setQ(e.target.value)} placeholder="Search" value={q} />
          </label>
          <SmoothTab
            activeColor="bg-sky/15"
            activeTextColor="text-sky"
            className="w-full max-w-none [&>div:first-child>div]:w-full [&>div:last-child]:border-zinc-200 [&>div:last-child]:bg-deep"
            items={[
              { id: "all", title: "All", content: list(shown, false) },
              { id: "protein", title: "Best protein value", content: list(ranked, true) },
            ]}
            label="Pantry view"
          />
        </>
      ) : (
        <Card>
          <Empty text="Add what you buy with its pack size, price and macros. Or send me your shopping list in chat and I'll fill it in." title="Start with your groceries">
            <Btn onClick={() => open({ kind: "product" })} small>
              <Plus /> Add groceries
            </Btn>
          </Empty>
        </Card>
      )}
    </Page>
  );
}

/* ---------- Shop ---------- */
export function Shop({ go }: { go: (t: string) => void }) {
  const { meals, products, checks, toggleCheck, stockUp } = useData();
  const t = today();
  const needs = useMemo(() => {
    const need: Record<string, number> = {};
    const horizon = addDays(t, 6);
    for (const m of meals) {
      if (m.eaten || m.day < t || m.day > horizon) continue;
      for (const it of m.items) {
        const p = products[it.product_id];
        if (p) need[p.id] = (need[p.id] ?? 0) + units(it, p);
      }
    }
    return Object.entries(need)
      .map(([id, u]) => {
        const p = products[id];
        const have = p.stock ?? 0;
        const packs = Math.max(u - have, 0) > 0 ? Math.ceil((u - have) / (p.pack_size || 1)) : 0;
        return { p, u, have, packs, cost: packs * p.price };
      })
      .filter((x) => x.packs > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [meals, products, t]);
  const total = needs.reduce((a, x) => a + x.cost, 0);
  const ticked = needs.filter((x) => checks.has(x.p.id));
  return (
    <Page sub="What your plan needs for the next 7 days" title="Shopping">
      {needs.length ? (
        <>
          <Card className="flex items-end justify-between">
            <div>
              <p className="num font-display text-[30px] font-bold leading-none text-sand [font-stretch:120%]">{fmt(total)}</p>
              <p className="mt-1 text-[13px] text-zinc-600">EGP estimated</p>
            </div>
            <p className="num text-[13px] text-zinc-600">
              {ticked.length} of {needs.length} in the basket
            </p>
          </Card>
          <Card className="py-1">
            <div className="flex flex-col divide-y divide-zinc-200">
              {needs.map((x) => {
                const on = checks.has(x.p.id);
                return (
                  <div className="flex min-h-14 items-center gap-2 py-2" key={x.p.id}>
                    <Check label={`${on ? "Untick" : "Tick"} ${x.p.name}`} on={on} onClick={() => toggleCheck(x.p.id)} />
                    <span className={cn("min-w-0 flex-1 transition-opacity", on && "opacity-40")}>
                      <span className="block truncate font-semibold">{x.p.name}</span>
                      <span className="num block text-[12.5px] text-zinc-600">
                        need {fmt(r0(x.u))}
                        {x.p.unit}, have {fmt(r0(x.have))}
                        {x.p.unit}
                      </span>
                    </span>
                    <span className={cn("num shrink-0 text-right text-[12px] text-zinc-600 transition-opacity", on && "opacity-40")}>
                      <b className="block text-[14.5px] font-semibold text-ink">
                        {x.packs} × {fmt(x.p.pack_size)}
                        {x.p.unit}
                      </b>
                      {fmt(x.cost)} EGP
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
          {ticked.length > 0 && (
            <Btn
              kind="primary"
              onClick={async () => {
                await stockUp(ticked.map((x) => ({ id: x.p.id, amount: x.packs * x.p.pack_size })));
                toast("Pantry updated");
              }}
            >
              Done shopping · add {ticked.length} to pantry
            </Btn>
          )}
        </>
      ) : (
        <Card>
          <Empty text="Plan meals for the coming week. Anything your pantry is short on shows up here, rounded up to whole packs." title="Nothing to buy">
            <Btn onClick={() => go("plan")} small>
              Go to Plan
            </Btn>
          </Empty>
        </Card>
      )}
    </Page>
  );
}
