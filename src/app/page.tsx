"use client";

import { BookOpen, Calendar, House, Refrigerator, ShoppingCart } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Btn, Field, Toaster } from "@/components/app/kit";
import { type Open, Pantry, Plan, Recipes, Shop, Today } from "@/components/app/screens";
import { MealSheet, ProductSheet, RecipeSheet, StatsSheet, TargetsSheet } from "@/components/app/sheets";
import { today } from "@/lib/calc";
import { DataProvider, useData } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "today", label: "Today", Icon: House },
  { id: "plan", label: "Plan", Icon: Calendar },
  { id: "recipes", label: "Recipes", Icon: BookOpen },
  { id: "pantry", label: "Pantry", Icon: Refrigerator },
  { id: "shop", label: "Shop", Icon: ShoppingCart },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (res.error) setMsg(res.error.message);
    else if (mode === "up" && !res.data.session) setMsg("Check your email and tap the confirm link, then come back and sign in.");
  };
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-5">
      <div>
        <h1 className="font-display text-[28px] font-bold text-sand [font-stretch:110%]">Prep Kitchen</h1>
        <p className="mt-1 text-[14px] text-zinc-600">Meal prep, costs and macros in one place.</p>
      </div>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <Field autoComplete="email" label="Email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
        <Field
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          label="Password"
          minLength={6}
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          value={password}
        />
        {msg && <p className="text-[13.5px] text-sand">{msg}</p>}
        <Btn disabled={busy} kind="primary" type="submit">
          {busy ? "One sec…" : mode === "in" ? "Sign in" : "Create account"}
        </Btn>
      </form>
      <Btn kind="quiet" onClick={() => setMode(mode === "in" ? "up" : "in")} small>
        {mode === "in" ? "First time here? Create an account" : "Have an account? Sign in"}
      </Btn>
    </main>
  );
}

function Shell() {
  const { session, ready, error } = useData();
  const [tab, setTab] = useState<Tab>("today");
  const [open, setOpen] = useState<Open | null>(null);
  const close = () => setOpen(null);
  const go = (t: string) => {
    setTab(t as Tab);
    window.scrollTo({ top: 0 });
  };
  if (!ready) return null;
  if (!session) return <Login />;
  return (
    <>
      <main className="pt-safe mx-auto max-w-lg px-5 pb-32">
        {error && <p className="mb-3 rounded-xl bg-amber/12 px-3 py-2.5 text-[13px] text-sand">Couldn&apos;t load everything: {error}</p>}
        {tab === "today" && <Today go={go} key="today" open={setOpen} />}
        {tab === "plan" && <Plan key="plan" open={setOpen} />}
        {tab === "recipes" && <Recipes key="recipes" open={setOpen} />}
        {tab === "pantry" && <Pantry key="pantry" open={setOpen} />}
        {tab === "shop" && <Shop go={go} key="shop" />}
      </main>

      <nav aria-label="Sections" className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 px-5">
        <div className="pointer-events-auto mx-auto grid h-[60px] max-w-md grid-cols-5 rounded-[20px] bg-white/80 p-[5px] shadow-[inset_0_1px_0_rgba(239,230,216,.07),inset_0_0_0_1px_rgba(150,95,50,.16),0_6px_14px_-8px_rgba(120,70,30,.18)] backdrop-blur-xl">
          {TABS.map(({ id, label, Icon }) => {
            const on = tab === id;
            return (
              <button
                aria-current={on ? "page" : undefined}
                className={cn("relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold transition-colors", on ? "text-sky" : "text-zinc-500")}
                key={id}
                onClick={() => go(id)}
                type="button"
              >
                {on && (
                  <motion.span
                    className="absolute inset-0 rounded-[15px] bg-sky/14"
                    layoutId="tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 38 }}
                  />
                )}
                <Icon className="relative size-[21px]" strokeWidth={1.8} />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <ProductSheet id={open?.kind === "product" ? open.id : undefined} onClose={close} open={open?.kind === "product"} />
      <RecipeSheet
        id={open?.kind === "recipe" ? open.id : undefined}
        onClose={close}
        onPlan={(recipeId) => setOpen({ kind: "meal", day: today(), recipeId })}
        open={open?.kind === "recipe"}
      />
      <MealSheet
        day={open?.kind === "meal" ? open.day : today()}
        id={open?.kind === "meal" ? open.id : undefined}
        onClose={close}
        open={open?.kind === "meal"}
        recipeId={open?.kind === "meal" ? open.recipeId : undefined}
      />
      <TargetsSheet onClose={close} open={open?.kind === "targets"} />
      <StatsSheet onClose={close} open={open?.kind === "stats"} />
      <Toaster />
    </>
  );
}

export default function Home() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
