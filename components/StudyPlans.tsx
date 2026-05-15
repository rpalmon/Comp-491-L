"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  where,
} from "firebase/firestore";

interface Summary {
  id: string;
  title: string;
  content: string;
  mode: string;
  createdAt: Date;
}

type PlanItemType = "learn" | "review" | "practice" | "final";

interface PlanItem {
  type: PlanItemType;
  summaryId?: string;
  title: string;
}

interface DayPlan {
  dateKey: string; // YYYY-MM-DD (local)
  date: Date;
  items: PlanItem[];
}

interface SavedPlanMeta {
  id: string;
  testDate: string;
  sessionsPerDay: number;
  selectedSummaryIds: string[];
  createdAt: Date;
}

function toDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatPretty(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getPreview(content: string) {
  const clean = content.replace(/[#*_\->`]/g, "").trim();
  return clean.length > 90 ? clean.slice(0, 90) + "..." : clean;
}

function generateStudyPlan(params: {
  summaries: Summary[];
  selectedIds: string[];
  testDate: Date;
  sessionsPerDay: number;
}): DayPlan[] {
  const { summaries, selectedIds, testDate, sessionsPerDay } = params;
  const selected = summaries.filter((s) => selectedIds.includes(s.id));
  const today = startOfDay(new Date());
  const end = startOfDay(testDate);

  if (selected.length === 0) return [];
  if (end.getTime() < today.getTime()) return [];

  const daysCount = Math.floor((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const days: DayPlan[] = Array.from({ length: daysCount }, (_, i) => {
    const date = addDays(today, i);
    return { date, dateKey: toDateKey(date), items: [] };
  });

  const sessions = clamp(Math.floor(sessionsPerDay), 1, 3);

  // Assign "learn" sessions first (new material).
  let cursor = 0;
  for (const s of selected) {
    const dayIdx = Math.floor(cursor / sessions);
    if (dayIdx >= days.length) break;
    days[dayIdx].items.push({
      type: "learn",
      summaryId: s.id,
      title: `Learn: ${s.title}`,
    });
    cursor++;
  }

  // Fill remaining sessions with spaced review + practice.
  const allIds = selected.map((s) => s.id);
  const reviewsStartIdx = Math.min(days.length - 1, Math.floor(cursor / sessions));
  let reviewCursor = 0;

  for (let dayIdx = reviewsStartIdx; dayIdx < days.length; dayIdx++) {
    // Ensure test day has a "final review" feel.
    const isTestDay = dayIdx === days.length - 1;
    const slotsLeft = sessions - days[dayIdx].items.length;
    if (slotsLeft <= 0) continue;

    if (isTestDay) {
      days[dayIdx].items.push({ type: "final", title: "Final review: skim key points + do a quick self-test" });
      if (days[dayIdx].items.length < sessions) {
        days[dayIdx].items.push({ type: "practice", title: "Practice: answer 10–15 questions from memory" });
      }
      continue;
    }

    for (let slot = 0; slot < slotsLeft; slot++) {
      const id = allIds[reviewCursor % allIds.length];
      const s = selected.find((x) => x.id === id);
      if (!s) continue;
      const isPracticeSlot = (dayIdx + slot) % 4 === 0;
      days[dayIdx].items.push(
        isPracticeSlot
          ? { type: "practice", summaryId: s.id, title: `Practice: write recall notes for ${s.title}` }
          : { type: "review", summaryId: s.id, title: `Review: ${s.title}` }
      );
      reviewCursor++;
    }
  }

  return days.filter((d) => d.items.length > 0);
}

export default function StudyPlans() {
  const { user } = useAuth();

  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const [testDateStr, setTestDateStr] = useState("");
  const [sessionsPerDay, setSessionsPerDay] = useState(2);
  const [plan, setPlan] = useState<DayPlan[]>([]);
  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlanMeta[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setSummaries([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "summaries"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
      const docs = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        title: doc.data().title,
        content: doc.data().content,
        mode: doc.data().mode,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Summary[];
      docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setSummaries(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSavedPlans([]);
      setLoadingSavedPlans(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingSavedPlans(true);
      try {
        const q = query(collection(db, "studyPlans"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        const docs = snap.docs.map((d: QueryDocumentSnapshot) => ({
          id: d.id,
          testDate: String(d.data().testDate ?? ""),
          sessionsPerDay: Number(d.data().sessionsPerDay ?? 2),
          selectedSummaryIds: Array.isArray(d.data().selectedSummaryIds) ? d.data().selectedSummaryIds : [],
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })) as SavedPlanMeta[];
        docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        if (!cancelled) setSavedPlans(docs);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingSavedPlans(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    // Auto-select all summaries on first load.
    if (loading) return;
    setSelectedIds((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, boolean> = {};
      for (const s of summaries) next[s.id] = true;
      return next;
    });
  }, [loading, summaries]);

  const selectedIdList = useMemo(
    () => Object.entries(selectedIds).filter(([, v]) => v).map(([k]) => k),
    [selectedIds]
  );

  const testDate = useMemo(() => {
    if (!testDateStr) return null;
    // Input is YYYY-MM-DD; interpret in local time.
    const [y, m, d] = testDateStr.split("-").map((x) => Number(x));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, [testDateStr]);

  const planByKey = useMemo(() => {
    const map = new Map<string, DayPlan>();
    for (const day of plan) map.set(day.dateKey, day);
    return map;
  }, [plan]);

  const calendar = useMemo(() => {
    if (!plan.length) return null;
    const first = startOfDay(plan[0].date);
    const last = startOfDay(plan[plan.length - 1].date);
    const start = addDays(first, -first.getDay()); // Sunday
    const end = addDays(last, 6 - last.getDay()); // Saturday
    const daysCount = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return Array.from({ length: daysCount }, (_, i) => startOfDay(addDays(start, i)));
  }, [plan]);

  const handleGenerate = () => {
    setError("");
    if (!testDate) {
      setError("Please choose your test/quiz date.");
      return;
    }
    if (selectedIdList.length === 0) {
      setError("Select at least one summary to build a study plan.");
      return;
    }
    const generated = generateStudyPlan({
      summaries,
      selectedIds: selectedIdList,
      testDate,
      sessionsPerDay,
    });
    if (generated.length === 0) {
      setError("That date is in the past, or there’s not enough data to make a plan.");
      return;
    }
    setPlan(generated);
    setActiveDayKey(generated[0]?.dateKey ?? null);
  };

  const handleSavePlan = async () => {
    if (!user) return;
    if (!plan.length || !testDate) return;
    setSaving(true);
    setError("");
    try {
      const ref = await addDoc(collection(db, "studyPlans"), {
        userId: user.uid,
        testDate: testDateStr,
        sessionsPerDay,
        selectedSummaryIds: selectedIdList,
        days: plan.map((d) => ({
          dateKey: d.dateKey,
          items: d.items,
        })),
        createdAt: serverTimestamp(),
      });
      setSavedPlans((prev) => [
        {
          id: ref.id,
          testDate: testDateStr,
          sessionsPerDay,
          selectedSummaryIds: selectedIdList,
          createdAt: new Date(),
        },
        ...prev,
      ]);
    } catch {
      setError("Couldn’t save right now. Your plan is still visible here.");
    } finally {
      setSaving(false);
    }
  };

  const activeDay = activeDayKey ? planByKey.get(activeDayKey) : null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="h-40 rounded-2xl shimmer-loading border border-white/[0.04]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-blue-500/15 rounded-3xl blur-2xl" />
          <div className="relative w-24 h-24 glass rounded-3xl flex items-center justify-center text-5xl">📅</div>
        </div>
        <h2 className="text-xl font-semibold text-white mb-3">Sign in to create a study plan</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Study plans are built from your saved summaries. Please sign in, then come back here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center">
            <span className="text-xl">📅</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Study Plans</h1>
            <p className="text-gray-500 text-sm">Pick a test date and we’ll turn your saved summaries into a calendar.</p>
          </div>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="text-center py-20">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-blue-500/15 rounded-3xl blur-2xl" />
            <div className="relative w-24 h-24 glass rounded-3xl flex items-center justify-center text-5xl">📅</div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">No summaries yet</h2>
          <p className="text-gray-500 max-w-md mx-auto">Save at least one summary first, then come back to generate a plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card rounded-2xl p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Test / quiz date
                  </label>
                  <input
                    type="date"
                    value={testDateStr}
                    onChange={(e) => setTestDateStr(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Sessions per day
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => setSessionsPerDay(n)}
                        className={`px-3 py-2 rounded-xl border transition-all text-sm font-semibold ${
                          sessionsPerDay === n
                            ? "border-violet-500/40 bg-violet-500/10 text-white"
                            : "border-white/[0.08] bg-white/[0.03] text-gray-300 hover:bg-white/[0.06]"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGenerate}
                    className="group relative flex-1 py-3 rounded-xl font-semibold overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative text-white">Generate plan</span>
                  </button>
                  <button
                    disabled={!plan.length || saving}
                    onClick={handleSavePlan}
                    className={`px-4 py-3 rounded-xl font-semibold border transition-all ${
                      !plan.length || saving
                        ? "border-white/[0.08] bg-white/[0.02] text-gray-500 cursor-not-allowed"
                        : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                    }`}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Recent saved plans</h3>
                {loadingSavedPlans && <span className="text-xs text-gray-500">Loading…</span>}
              </div>
              {savedPlans.length === 0 ? (
                <p className="text-sm text-gray-500">No saved plans yet.</p>
              ) : (
                <div className="space-y-2">
                  {savedPlans.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setTestDateStr(p.testDate);
                        setSessionsPerDay(p.sessionsPerDay);
                        const next: Record<string, boolean> = {};
                        for (const s of summaries) next[s.id] = p.selectedSummaryIds.includes(s.id);
                        setSelectedIds(next);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm truncate">Test date: {p.testDate || "—"}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {p.selectedSummaryIds.length} summaries • {p.sessionsPerDay} sessions/day
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-400 font-bold uppercase tracking-wide">
                          Load
                        </span>
                      </div>
                    </button>
                  ))}
                  <p className="text-[11px] text-gray-600 pt-1">
                    Loading a saved plan restores your settings; click “Generate plan” to rebuild the calendar.
                  </p>
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Use these summaries</h3>
                <button
                  onClick={() => {
                    const allSelected = selectedIdList.length === summaries.length;
                    const next: Record<string, boolean> = {};
                    for (const s of summaries) next[s.id] = !allSelected;
                    setSelectedIds(next);
                  }}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {selectedIdList.length === summaries.length ? "Clear all" : "Select all"}
                </button>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {summaries.map((s) => {
                  const checked = !!selectedIds[s.id];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedIds((prev) => ({ ...prev, [s.id]: !checked }))}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        checked
                          ? "border-violet-500/30 bg-violet-500/10"
                          : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center ${
                            checked ? "border-violet-500 bg-violet-500/20" : "border-white/[0.15] bg-transparent"
                          }`}
                        >
                          {checked && (
                            <svg className="w-3.5 h-3.5 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold truncate">{s.title}</p>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide ${
                              s.mode === "notes"
                                ? "bg-violet-500/15 text-violet-400 border-violet-500/25"
                                : "bg-blue-500/15 text-blue-400 border-blue-500/25"
                            }`}>
                              {s.mode === "notes" ? "Notes" : "Summary"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{getPreview(s.content)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Calendar + day details */}
          <div className="lg:col-span-3 space-y-4">
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Calendar</h3>
                {testDate && (
                  <span className="text-xs text-gray-500">
                    Test date: <span className="text-gray-300 font-semibold">{formatPretty(testDate)}</span>
                  </span>
                )}
              </div>

              {!plan.length || !calendar ? (
                <div className="text-center py-14 text-gray-500">
                  Generate a plan to see it on the calendar.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-2 mb-2 text-[11px] text-gray-500 font-bold uppercase tracking-widest">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="text-center">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {calendar.map((d) => {
                      const key = toDateKey(d);
                      const dayPlan = planByKey.get(key);
                      const isActive = activeDayKey === key;
                      const isInPlan = !!dayPlan;
                      return (
                        <button
                          key={key}
                          onClick={() => isInPlan && setActiveDayKey(key)}
                          className={`rounded-xl border p-2 text-left min-h-[68px] transition-all ${
                            isActive
                              ? "border-violet-500/40 bg-violet-500/10"
                              : isInPlan
                                ? "border-white/[0.10] bg-white/[0.03] hover:bg-white/[0.06]"
                                : "border-white/[0.06] bg-white/[0.01] opacity-60 cursor-default"
                          }`}
                          disabled={!isInPlan}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-semibold">{d.getDate()}</span>
                            {isInPlan && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 font-bold">
                                {dayPlan.items.length}
                              </span>
                            )}
                          </div>
                          {isInPlan && (
                            <div className="mt-2 text-[11px] text-gray-400 line-clamp-2">
                              {dayPlan.items[0]?.title}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">What to study</h3>
                {activeDay?.date && <span className="text-xs text-gray-500">{formatPretty(activeDay.date)}</span>}
              </div>

              {!activeDay ? (
                <div className="text-gray-500 py-10 text-center">
                  Pick a day on the calendar to see the details.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeDay.items.map((item, idx) => (
                    <div
                      key={`${activeDay.dateKey}-${idx}`}
                      className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{item.title}</p>
                          {item.summaryId && (
                            <p className="text-xs text-gray-500 mt-1">
                              Tip: close the summary, then explain it out loud from memory.
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wide ${
                          item.type === "learn"
                            ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
                            : item.type === "review"
                              ? "bg-violet-500/15 text-violet-300 border-violet-500/20"
                              : item.type === "practice"
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/20"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                        }`}>
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

