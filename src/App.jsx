import { useState, useEffect, useCallback } from "react";

/* ─────────────────────── DATA SCHEMA ─────────────────────── */

const EXERCISES = {
  conditioning: {
    label: "Conditioning",
    icon: "🫁",
    exercises: {
      mile: {
        label: "Mile Time",
        tiers: ["9:30", "9:00", "8:30", "8:00", "7:30"],
      },
    },
  },
  strength: {
    label: "Strength",
    icon: "🏋️",
    exercises: {
      bench: {
        label: "Bench Press",
        tiers: ["155×5", "165×5", "185×5", "205×5", "225×5"],
      },
      squat: {
        label: "Squat",
        tiers: ["135×5", "155×5", "185×5", "225×5", "275×5"],
      },
      deadlift: {
        label: "Deadlift / RDL",
        tiers: ["135×5", "185×5", "225×5", "275×5", "315×5"],
      },
      curl: {
        label: "DB Curl",
        tiers: ["25×10", "30×10", "35×10", "40×10", "45×10"],
      },
      tricep: {
        label: "Tricep Ext",
        tiers: ["35×10", "45×10", "55×10", "65×10", "75×10"],
      },
    },
  },
  bodyweight: {
    label: "Bodyweight",
    icon: "💪",
    exercises: {
      pushups: { label: "Push-ups", tiers: ["15", "20", "25", "35", "50"] },
      plank: {
        label: "Plank",
        tiers: ["60s", "75s", "90s", "2 min", "3 min"],
      },
      sideplank: {
        label: "Side Plank",
        tiers: ["30s", "45s", "60s", "75s", "90s"],
      },
    },
  },
  pullups: {
    label: "Pull-ups",
    icon: "🧗",
    exercises: {
      pullup: {
        label: "Pull-up Ladder",
        tiers: [
          "Thick band ×8",
          "Med band ×6",
          "Med band ×10",
          "Light band ×5",
          "Unassisted ×3",
        ],
      },
    },
  },
};

const TIER_LABELS = ["Base", "Building", "Solid", "Strong", "Beast"];
const RANK_NAMES = ["Recruit", "Contender", "Athlete", "Warrior", "Beast"];
const RANK_COLORS = ["#6b7280", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];



/* ─────────────────────── UTILITIES ─────────────────────── */

const today = () => new Date().toISOString().split("T")[0];

const allExerciseKeys = () => {
  const keys = [];
  Object.values(EXERCISES).forEach((c) =>
    Object.keys(c.exercises).forEach((k) => keys.push(k))
  );
  return keys;
};

const getOverallLevel = (tiers) => {
  const keys = allExerciseKeys();
  if (!keys.length) return 0;
  return keys.reduce((s, k) => s + (tiers[k] ?? -1) + 1, 0) / (keys.length * 5);
};

const getRankIdx = (level) => Math.min(Math.floor(level * 5), 4);

const getStreak = (logs) => {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const check = new Date(d);
    check.setDate(d.getDate() - i);
    const key = check.toISOString().split("T")[0];
    const log = logs[key];
    if (log && Object.values(log).some((v) => v)) {
      streak++;
    } else if (i > 0) break;
  }
  return streak;
};

const getExerciseInfo = (key) => {
  for (const cat of Object.values(EXERCISES)) {
    if (cat.exercises[key]) return { ...cat.exercises[key], catIcon: cat.icon };
  }
  return null;
};

/* ─────────────────────── STATE ─────────────────────── */

const STORAGE_KEY = "beastmode_v3";
const DEFAULT = { tiers: {}, history: [], dailyLogs: {} };

const load = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? { ...DEFAULT, ...JSON.parse(s) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

const save = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

/* ─────────────────────── STYLES ─────────────────────── */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #06080f;
    --surface: rgba(255,255,255,0.025);
    --surface-hover: rgba(255,255,255,0.05);
    --border: rgba(255,255,255,0.05);
    --text-primary: #edf2f7;
    --text-secondary: #8896ab;
    --text-muted: #4a5568;
    --green: #22c55e;
    --green-bg: rgba(34,197,94,0.1);
    --green-border: rgba(34,197,94,0.25);
    --amber: #f59e0b;
    --amber-bg: rgba(245,158,11,0.08);
    --amber-border: rgba(245,158,11,0.2);
    --blue: #3b82f6;
    --red: #ef4444;
    --font: 'Outfit', system-ui, sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  body { background: var(--bg); }

  .bm-root {
    font-family: var(--font);
    color: var(--text-primary);
    background: var(--bg);
    min-height: 100vh;
    max-width: 480px;
    margin: 0 auto;
    padding-bottom: 90px;
    -webkit-font-smoothing: antialiased;
  }

  .bm-root button { font-family: var(--font); cursor: pointer; -webkit-tap-highlight-color: transparent; }

  @keyframes levelUp {
    0% { transform: scale(0.8); opacity: 0; }
    20% { transform: scale(1.15); opacity: 1; }
    40% { transform: scale(0.95); }
    60% { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes burst {
    0% { transform: scale(0); opacity: 1; }
    50% { opacity: 0.6; }
    100% { transform: scale(3); opacity: 0; }
  }

  .tier-btn {
    position: relative;
    border-radius: 10px;
    padding: 10px 6px;
    border: 1.5px solid var(--border);
    background: var(--surface);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    transition: all 0.25s ease;
    font-family: var(--mono);
    overflow: hidden;
    min-width: 0;
    flex: 1;
  }
  .tier-btn.done {
    border-color: var(--green-border);
    background: var(--green-bg);
    color: var(--green);
    font-weight: 700;
  }
  .tier-btn.next {
    border: 1.5px dashed var(--amber-border);
    background: var(--amber-bg);
    color: var(--amber);
  }
  .tier-btn .burst-ring {
    position: absolute; inset: -2px; border-radius: 12px;
    border: 2px solid var(--green);
    animation: burst 0.7s ease-out forwards;
    pointer-events: none;
  }

  .inc-btn {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
    font-family: var(--mono);
    transition: all 0.15s;
  }
  .inc-btn:active { transform: scale(0.95); background: var(--surface-hover); }

  .tab-btn {
    flex: 1;
    padding: 10px 0;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
  }
  .tab-btn.active {
    background: rgba(255,255,255,0.07);
    color: var(--text-primary);
  }
`;

/* ─────────────────── CELEBRATION OVERLAY ─────────────────── */

function Celebration({ exercise, tierIdx, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(6,8,15,0.92)",
        backdropFilter: "blur(12px)",
        animation: "fadeSlide 0.3s ease",
      }}
    >
      <div
        style={{
          fontSize: 56,
          animation: "levelUp 0.6s ease",
          marginBottom: 12,
        }}
      >
        🏆
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#f59e0b",
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        NEW PR
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 6,
          animation: "levelUp 0.6s ease 0.15s both",
        }}
      >
        {exercise}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          background: "linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "shimmer 2s linear infinite, levelUp 0.6s ease 0.3s both",
          letterSpacing: 1,
        }}
      >
        → {TIER_LABELS[tierIdx]} Unlocked
      </div>
    </div>
  );
}

/* ────────────────── SMART TODAY VIEW ──────────────────── */

function TodayView({ tiers, onSetTier, workoutDone, onToggleWorkout }) {
  const items = [];
  Object.entries(EXERCISES).forEach(([, cat]) =>
    Object.entries(cat.exercises).forEach(([key, ex]) => {
      const current = tiers[key] ?? -1;
      if (current < 4) {
        items.push({
          key,
          label: ex.label,
          icon: cat.icon,
          currentTier: current,
          currentLabel: current >= 0 ? ex.tiers[current] : "—",
          nextTier: current + 1,
          nextLabel: ex.tiers[current + 1],
        });
      }
    })
  );

  const maxed = [];
  Object.entries(EXERCISES).forEach(([, cat]) =>
    Object.entries(cat.exercises).forEach(([key, ex]) => {
      if ((tiers[key] ?? -1) >= 4) maxed.push({ key, label: ex.label, icon: cat.icon });
    })
  );

  return (
    <div style={{ animation: "fadeSlide 0.3s ease" }}>
      {/* Workout toggle */}
      <button
        onClick={onToggleWorkout}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: 14,
          border: workoutDone ? "1px solid var(--green-border)" : "1.5px dashed var(--amber-border)",
          background: workoutDone ? "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))" : "var(--amber-bg)",
          color: workoutDone ? "var(--green)" : "var(--amber)",
          fontSize: 15,
          fontWeight: 700,
          transition: "all 0.3s",
          marginBottom: 20,
        }}
      >
        {workoutDone ? "🏋️ Workout Complete ✓" : "🏋️ Mark Today's Workout Done"}
      </button>

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
          Next Targets
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Tap when you hit a new level
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              background: "var(--surface)",
              borderRadius: 14,
              border: "1px solid var(--border)",
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 22, width: 32, textAlign: "center" }}>
              {item.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontFamily: "var(--mono)",
                  marginTop: 2,
                }}
              >
                {item.currentTier >= 0 && (
                  <span style={{ color: "var(--green)" }}>
                    {item.currentLabel}
                  </span>
                )}
                {item.currentTier >= 0 && " → "}
                <span style={{ color: "var(--amber)" }}>{item.nextLabel}</span>
              </div>
            </div>
            <button
              onClick={() => onSetTier(item.key, item.nextTier)}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "1.5px dashed var(--amber-border)",
                background: "var(--amber-bg)",
                color: "var(--amber)",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--mono)",
                whiteSpace: "nowrap",
              }}
            >
              ✓ Hit it
            </button>
          </div>
        ))}
      </div>

      {maxed.length > 0 && (
        <div style={{ marginTop: 20, padding: "12px 16px", background: "var(--green-bg)", borderRadius: 14, border: "1px solid var(--green-border)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>
            🏆 Maxed Out
          </div>
          {maxed.map((m) => (
            <div key={m.key} style={{ fontSize: 13, color: "var(--green)", padding: "2px 0" }}>
              {m.icon} {m.label} — Beast tier
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────── FULL SCORECARD ──────────────────── */

function Scorecard({ tiers, onSetTier }) {
  const [open, setOpen] = useState(null);

  return (
    <div style={{ animation: "fadeSlide 0.3s ease" }}>
      {Object.entries(EXERCISES).map(([catKey, cat]) => {
        const exEntries = Object.entries(cat.exercises);
        const isOpen = open === catKey;
        const filled = exEntries.reduce(
          (s, [k]) => s + ((tiers[k] ?? -1) + 1),
          0
        );
        const total = exEntries.length * 5;

        return (
          <div
            key={catKey}
            style={{
              marginBottom: 8,
              background: "var(--surface)",
              borderRadius: 14,
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : catKey)}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{cat.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{cat.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                    {exEntries.length} exercise{exEntries.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 48, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(filled / total) * 100}%`, background: "var(--blue)", borderRadius: 3, transition: "width 0.5s" }} />
                </div>
                <span style={{ fontSize: 14, color: "var(--text-muted)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  ▾
                </span>
              </div>
            </button>
            {isOpen && (
              <div style={{ padding: "0 14px 14px", animation: "fadeSlide 0.2s ease" }}>
                {exEntries.map(([exKey, ex]) => {
                  const cur = tiers[exKey] ?? -1;
                  return (
                    <div key={exKey} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                          {ex.label}
                        </span>
                        {cur >= 0 && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                            {TIER_LABELS[cur]}
                            {cur < 4 && ` → ${TIER_LABELS[cur + 1]}`}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {ex.tiers.map((t, idx) => {
                          const done = idx <= cur;
                          const isNext = idx === cur + 1;
                          let cls = "tier-btn";
                          if (done) cls += " done";
                          else if (isNext) cls += " next";
                          return (
                            <button
                              key={idx}
                              className={cls}
                              onClick={() => {
                                if (idx > cur) onSetTier(exKey, idx);
                                else if (idx < cur && confirm(`Demote ${ex.label} to ${TIER_LABELS[idx]}?`)) {
                                  onSetTier(exKey, idx, true);
                                }
                              }}
                            >
                              <div style={{ fontSize: 9, opacity: 0.5, marginBottom: 2 }}>T{idx}</div>
                              {t}
                              {done && <span style={{ position: "absolute", top: 1, right: 3, fontSize: 8 }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────── TEST DAY ──────────────────── */

function TestDay({ tiers, onSetTier, onClose }) {
  const all = [];
  Object.entries(EXERCISES).forEach(([, cat]) =>
    Object.entries(cat.exercises).forEach(([k, ex]) =>
      all.push({ key: k, ...ex, catIcon: cat.icon, catLabel: cat.label })
    )
  );

  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState({});
  const [done, setDone] = useState(false);
  const ex = all[idx];

  const pick = (tierIdx) => {
    setPicks((p) => ({ ...p, [ex.key]: tierIdx }));
    onSetTier(ex.key, tierIdx);
    if (idx < all.length - 1) setTimeout(() => setIdx((i) => i + 1), 350);
    else setTimeout(() => setDone(true), 350);
  };

  const skip = () => {
    if (idx < all.length - 1) setIdx((i) => i + 1);
    else setDone(true);
  };

  if (done) {
    const prs = Object.entries(picks).filter(([k, v]) => v > (tiers[k] ?? -1));
    return (
      <div style={{ textAlign: "center", padding: "48px 20px", animation: "fadeSlide 0.4s ease" }}>
        <div style={{ fontSize: 56, marginBottom: 16, animation: "levelUp 0.6s ease" }}>🔥</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          TEST DAY COMPLETE
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
          {prs.length > 0 ? `${prs.length} new PR${prs.length > 1 ? "s" : ""}!` : "All results recorded."}
        </p>
        {prs.length > 0 && (
          <div style={{ background: "var(--amber-bg)", borderRadius: 14, padding: 16, marginBottom: 24, border: "1px solid var(--amber-border)", textAlign: "left" }}>
            {prs.map(([k, v]) => {
              const info = getExerciseInfo(k);
              return (
                <div key={k} style={{ padding: "5px 0", color: "var(--amber)", fontWeight: 600, fontSize: 14 }}>
                  🏆 {info?.label}: → {TIER_LABELS[v]}
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onClose} style={{ padding: "14px 36px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, var(--blue), #8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 700 }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeSlide 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Test Day</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{idx + 1} of {all.length}</div>
        </div>
        <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12 }}>
          Exit
        </button>
      </div>

      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 28, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${((idx + 1) / all.length) * 100}%`, background: "linear-gradient(90deg, var(--amber), var(--red))", borderRadius: 2, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
          {ex.catIcon} {ex.catLabel}
        </span>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginTop: 6 }}>
          {ex.label}
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Best you can do right now?</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ex.tiers.map((t, ti) => {
          const sel = picks[ex.key] === ti;
          return (
            <button
              key={ti}
              onClick={() => pick(ti)}
              style={{
                padding: "16px 18px",
                borderRadius: 12,
                border: sel ? "2px solid var(--green)" : "1.5px solid var(--border)",
                background: sel ? "var(--green-bg)" : "var(--surface)",
                color: sel ? "var(--green)" : "var(--text-secondary)",
                fontSize: 15,
                fontWeight: sel ? 700 : 500,
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--mono)",
                transition: "all 0.2s",
              }}
            >
              <span>{t}</span>
              <span style={{ fontSize: 11, opacity: 0.5 }}>{TIER_LABELS[ti]}</span>
            </button>
          );
        })}
        <button onClick={skip} style={{ marginTop: 4, padding: 8, borderRadius: 8, border: "none", background: "transparent", color: "var(--text-muted)", fontSize: 12 }}>
          Skip →
        </button>
      </div>
    </div>
  );
}

/* ────────────────── WEEK VIEW ──────────────────── */

function WeekView({ state }) {
  const start = new Date();
  start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().split("T")[0];
    return { key, day: ["S", "M", "T", "W", "T", "F", "S"][i], log: state.dailyLogs[key] || {} };
  });

  const workouts = days.filter((d) => d.log.workout).length;
  const streak = getStreak(state.dailyLogs);

  // Weekly wins
  const wins = [];
  if (workouts >= 3) wins.push(`${workouts} workouts this week`);
  const prs = state.history.filter((h) => {
    const d = new Date(h.date);
    return h.isPR && d >= start;
  });
  if (prs.length > 0) wins.push(`${prs.length} new PR${prs.length > 1 ? "s" : ""}`);
  if (streak >= 7) wins.push(`${streak}-day streak — keep it rolling`);

  // Count total tiers achieved
  const totalTiers = Object.values(state.tiers).reduce((s, v) => s + v + 1, 0);
  const maxTiers = allExerciseKeys().length * 5;

  return (
    <div style={{ animation: "fadeSlide 0.3s ease" }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>This Week</h2>

      {/* Day dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {days.map((d) => {
          const active = d.log.workout;
          const isToday = d.key === today();
          return (
            <div
              key={d.key}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 0",
                borderRadius: 10,
                background: active ? "var(--green-bg)" : "var(--surface)",
                border: isToday ? "1.5px solid rgba(59,130,246,0.4)" : "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>{d.day}</div>
              <div style={{ fontSize: 16 }}>{d.log.workout ? "🔥" : active ? "✓" : "·"}</div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[
          { val: workouts, label: "Workouts", color: "var(--amber)" },
          { val: `${Math.round((totalTiers / maxTiers) * 100)}%`, label: "Overall", color: "var(--blue)" },
          { val: streak, label: "Streak", color: "var(--green)" },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: "var(--surface)",
              borderRadius: 14,
              padding: "16px 14px",
              border: "1px solid var(--border)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "var(--mono)" }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly Wins */}
      {wins.length > 0 && (
        <div style={{ background: "var(--amber-bg)", borderRadius: 14, padding: 16, border: "1px solid var(--amber-border)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>
            🏆 Weekly Wins
          </div>
          {wins.map((w, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--text-primary)", padding: "3px 0", fontWeight: 500 }}>
              ✦ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────── SETTINGS / DATA ──────────────────── */

function DataView({ state, onImport, onReset }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beastmode-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.tiers) onImport(data);
          else alert("Invalid backup file.");
        } catch {
          alert("Could not read file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const prCount = state.history.filter((h) => h.isPR).length;
  const logDays = Object.keys(state.dailyLogs).length;

  return (
    <div style={{ animation: "fadeSlide 0.3s ease" }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Data & Settings</h2>

      <div style={{ background: "var(--surface)", borderRadius: 14, padding: 16, border: "1px solid var(--border)", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Stats</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 2 }}>
          {prCount} PRs recorded · {logDays} days logged · {getStreak(state.dailyLogs)} day streak
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={exportData} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, textAlign: "left" }}>
          📦 Export Backup (JSON)
        </button>
        <button onClick={handleImport} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, textAlign: "left" }}>
          📥 Import Backup
        </button>
        <button
          onClick={() => { if (confirm("Reset ALL data? This cannot be undone.")) onReset(); }}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "var(--red)", fontSize: 14, fontWeight: 600, textAlign: "left", marginTop: 8 }}
        >
          🗑️ Reset All Data
        </button>
      </div>

      <div style={{ marginTop: 24, padding: 16, background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>
          PWA Tip
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          To install on your iPhone: open this page in Safari → tap the Share button → "Add to Home Screen." It'll launch full-screen like a native app.
        </p>
      </div>
    </div>
  );
}

/* ────────────────── MAIN APP ──────────────────── */

export default function BeastMode() {
  const [state, setState] = useState(load);
  const [view, setView] = useState("today");
  const [testMode, setTestMode] = useState(false);
  const [celebration, setCelebration] = useState(null);

  useEffect(() => { save(state); }, [state]);

  const setTier = useCallback((key, tierIdx, demote = false) => {
    setState((prev) => {
      const old = prev.tiers[key] ?? -1;
      const isPR = tierIdx > old && !demote;
      const newTiers = { ...prev.tiers, [key]: tierIdx };
      const entry = { date: today(), exercise: key, tier: tierIdx, isPR };
      const next = { ...prev, tiers: newTiers, history: [...prev.history, entry] };

      if (isPR) {
        const info = getExerciseInfo(key);
        setCelebration({ exercise: info?.label || key, tierIdx });
      }
      return next;
    });
  }, []);

  const updateDaily = useCallback((key, value) => {
    const d = today();
    setState((prev) => ({
      ...prev,
      dailyLogs: { ...prev.dailyLogs, [d]: { ...(prev.dailyLogs[d] || {}), [key]: value } },
    }));
  }, []);

  const level = getOverallLevel(state.tiers);
  const rankIdx = getRankIdx(level);
  const streak = getStreak(state.dailyLogs);
  const todayLog = state.dailyLogs[today()] || {};

  const tabs = [
    { id: "today", label: "Today", icon: "⚡" },
    { id: "board", label: "Board", icon: "📊" },
    { id: "week", label: "Week", icon: "📅" },
    { id: "data", label: "Data", icon: "⚙️" },
  ];

  return (
    <div className="bm-root">
      <style>{CSS}</style>

      {celebration && (
        <Celebration
          exercise={celebration.exercise}
          tierIdx={celebration.tierIdx}
          onDone={() => setCelebration(null)}
        />
      )}

      {/* Header */}
      <div style={{ padding: "20px 16px 14px", position: "sticky", top: 0, zIndex: 100, background: "rgba(6,8,15,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, background: "linear-gradient(135deg, #f1f5f9, #64748b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2 }}>
              BEAST MODE
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
              <span style={{ background: RANK_COLORS[rankIdx], color: "#fff", padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                {RANK_NAMES[rankIdx]}
              </span>
              {streak > 0 && (
                <span style={{ fontSize: 12, color: "var(--amber)", fontWeight: 700 }}>🔥 {streak}d</span>
              )}
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
                {Math.round(level * 100)}%
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {todayLog.workout && (
              <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>✓ Trained</span>
            )}
            <button
              onClick={() => setTestMode(true)}
              style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #ef4444, #f59e0b)", color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}
            >
              TEST
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px" }}>
        {testMode ? (
          <TestDay tiers={state.tiers} onSetTier={setTier} onClose={() => setTestMode(false)} />
        ) : view === "today" ? (
          <TodayView
            tiers={state.tiers}
            onSetTier={setTier}
            workoutDone={!!todayLog.workout}
            onToggleWorkout={() => updateDaily("workout", !todayLog.workout)}
          />
        ) : view === "board" ? (
          <Scorecard tiers={state.tiers} onSetTier={setTier} />
        ) : view === "week" ? (
          <WeekView state={state} />
        ) : (
          <DataView
            state={state}
            onImport={(d) => setState({ ...DEFAULT, ...d })}
            onReset={() => setState(DEFAULT)}
          />
        )}
      </div>

      {/* Bottom nav */}
      {!testMode && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(6,8,15,0.92)", backdropFilter: "blur(20px)", borderTop: "1px solid var(--border)", padding: "6px 12px 20px", zIndex: 100, maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`tab-btn ${view === t.id ? "active" : ""}`}
                onClick={() => setView(t.id)}
              >
                <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
                <div style={{ fontSize: 10 }}>{t.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
