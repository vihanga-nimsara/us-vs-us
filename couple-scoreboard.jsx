import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Cookie,
  Swords,
  HeartHandshake,
  CalendarX,
  Plus,
  Minus,
  PenLine,
  X,
  Check,
  RotateCcw,
  Crown,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  DialogStack,
  DialogStackTrigger,
  DialogStackOverlay,
  DialogStackBody,
  DialogStackContent,
  DialogStackHeader,
  DialogStackTitle,
  DialogStackDescription,
  DialogStackFooter,
} from "@/components/kibo-ui/dialog-stack";

/* ---------------------------------------------------------
   Design tokens (styled after willyoubmyvalentine.vercel.app)
   Sky:    #FFF8FB → #FFD9E6   (soft clouds gradient)
   Cloud:  #FFFFFF / #FFF9FB
   Ink:    #3E2C33             (warm plum-brown, not black)
   Coral:  #FF2D55             (player A / primary accent)
   Sky-B:  #6FB3D9             (player B accent)
   Gold:   #F5B942             (leader / champion glow)
   Fonts:  "Chewy" (display) / "Nunito" (body)
----------------------------------------------------------- */

const DEFAULT_CATEGORIES = [
  { id: "arguments", label: "Arguments won", icon: "swords" },
  { id: "snacks", label: "Snacks stolen", icon: "cookie" },
  { id: "sorry", label: "Apologised first", icon: "sorry" },
  { id: "cancels", label: "Plans cancelled", icon: "calendar" },
];

const ICONS = {
  swords: Swords,
  cookie: Cookie,
  sorry: HeartHandshake,
  calendar: CalendarX,
};

const EMOJI_CHOICES = ["😴", "📱", "🚗", "😂", "⏰", "🎮", "💌", "🍫", "🧹", "🛁"];

const STORAGE_KEY = "couple-scoreboard:v2";
const MAX_LOG = 40;

function loadDefaultState() {
  return {
    names: ["You", "Bae"],
    categories: DEFAULT_CATEGORIES,
    counts: DEFAULT_CATEGORIES.reduce((acc, c) => {
      acc[c.id] = [0, 0];
      return acc;
    }, {}),
    log: [],
  };
}

function renderIcon(iconKey, size, className) {
  const Lucide = ICONS[iconKey];
  if (Lucide) return <Lucide size={size} className={className} />;
  // custom category: iconKey is a raw emoji string
  return (
    <span className={className} style={{ fontSize: size, lineHeight: 1 }}>
      {iconKey || "⭐"}
    </span>
  );
}

function Cloud({ className, style }) {
  return (
    <svg viewBox="0 0 200 100" className={className} style={style} aria-hidden="true">
      <path
        d="M40 75c-16 0-28-12-28-27 0-14 11-26 25-27 4-16 19-28 37-28 17 0 32 11 37 27 3-1 6-1 9-1 16 0 29 13 29 29s-13 29-29 29H40z"
        fill="currentColor"
      />
    </svg>
  );
}

let confettiSeq = 0;

export default function CoupleScoreboard() {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [editingNameIdx, setEditingNameIdx] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatIcon, setNewCatIcon] = useState(EMOJI_CHOICES[0]);
  const [confetti, setConfetti] = useState([]);
  const prevLeaders = useRef({});
  const saveTimer = useRef(null);

  // ---- load ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY, false);
        if (cancelled) return;
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          const merged = { ...loadDefaultState(), ...parsed };
          setState(merged);
          merged.categories.forEach((cat) => {
            const [a, b] = merged.counts[cat.id] || [0, 0];
            prevLeaders.current[cat.id] = a === b ? null : a > b ? 0 : 1;
          });
        } else {
          setState(loadDefaultState());
        }
      } catch (e) {
        setState(loadDefaultState());
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- debounced save ----
  const persist = useCallback((next) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
      } catch (e) {
        // best-effort; ignore
      }
    }, 250);
  }, []);

  const updateState = useCallback(
    (updater) => {
      setState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const showToast = (msg) => {
    toast.success(msg);
  };

  const fireConfetti = () => {
    const pieces = Array.from({ length: 18 }).map(() => ({
      id: confettiSeq++,
      left: Math.random() * 100,
      delay: Math.random() * 0.2,
      dur: 1.1 + Math.random() * 0.8,
      scale: 0.8 + Math.random() * 0.6,
      emoji: ["🎉", "💖", "✨", "💝"][Math.floor(Math.random() * 4)],
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 1500);
  };

  if (!loaded || !state) {
    return (
      <div className="scoreboard-root scoreboard-loading">
        <style>{STYLES}</style>
        <div className="loading-cloud">
          <Cloud className="cloud-icon" />
          <span>Loading your scoreboard…</span>
        </div>
      </div>
    );
  }

  const { names, categories, counts, log } = state;

  const bump = (cat, playerIdx, delta) => {
    updateState((prev) => {
      const current = prev.counts[cat.id] || [0, 0];
      const nextForCat = [...current];
      nextForCat[playerIdx] = Math.max(0, nextForCat[playerIdx] + delta);

      const a = nextForCat[0];
      const b = nextForCat[1];
      const newLeader = a === b ? null : a > b ? 0 : 1;
      const oldLeader = prevLeaders.current[cat.id] ?? null;
      if (newLeader !== null && newLeader !== oldLeader && delta > 0) {
        fireConfetti();
      }
      prevLeaders.current[cat.id] = newLeader;

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        catId: cat.id,
        catLabel: cat.label,
        icon: cat.icon,
        playerIdx,
        delta,
        ts: Date.now(),
      };
      const nextLog = [entry, ...(prev.log || [])].slice(0, MAX_LOG);

      return {
        ...prev,
        counts: { ...prev.counts, [cat.id]: nextForCat },
        log: nextLog,
      };
    });

    toast(
      `${names[playerIdx]} ${delta > 0 ? "+1" : "−1"} ${cat.label.toLowerCase()}`,
      { icon: renderIcon(cat.icon, 16, "") }
    );
  };

  const undoLast = () => {
    updateState((prev) => {
      const [last, ...rest] = prev.log || [];
      if (!last) return prev;
      const current = prev.counts[last.catId] || [0, 0];
      const nextForCat = [...current];
      nextForCat[last.playerIdx] = Math.max(
        0,
        nextForCat[last.playerIdx] - last.delta
      );
      const a = nextForCat[0];
      const b = nextForCat[1];
      prevLeaders.current[last.catId] = a === b ? null : a > b ? 0 : 1;
      return {
        ...prev,
        counts: { ...prev.counts, [last.catId]: nextForCat },
        log: rest,
      };
    });
    showToast("Undone");
  };

  const startEditName = (idx) => {
    setEditingNameIdx(idx);
    setNameDraft(names[idx]);
  };

  const commitName = () => {
    const trimmed = nameDraft.trim().slice(0, 16);
    if (trimmed) {
      updateState((prev) => {
        const nextNames = [...prev.names];
        nextNames[editingNameIdx] = trimmed;
        return { ...prev, names: nextNames };
      });
    }
    setEditingNameIdx(null);
  };

  const addCategory = () => {
    const trimmed = newCatLabel.trim().slice(0, 28);
    if (!trimmed) {
      setCatDialogOpen(false);
      return;
    }
    const id = `custom-${Date.now()}`;
    updateState((prev) => ({
      ...prev,
      categories: [...prev.categories, { id, label: trimmed, icon: newCatIcon }],
      counts: { ...prev.counts, [id]: [0, 0] },
    }));
    prevLeaders.current[id] = null;
    setNewCatLabel("");
    setNewCatIcon(EMOJI_CHOICES[0]);
    setCatDialogOpen(false);
    showToast("Category added");
  };

  const removeCategory = (id) => {
    updateState((prev) => {
      const nextCounts = { ...prev.counts };
      delete nextCounts[id];
      return {
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        counts: nextCounts,
        log: (prev.log || []).filter((e) => e.catId !== id),
      };
    });
  };

  const resetAll = () => {
    updateState((prev) => ({
      ...prev,
      counts: prev.categories.reduce((acc, c) => {
        acc[c.id] = [0, 0];
        return acc;
      }, {}),
      log: [],
    }));
    categories.forEach((c) => (prevLeaders.current[c.id] = null));
    showToast("Scoreboard cleared");
  };

  // champion tally: count categories each player is leading
  let leadCountA = 0;
  let leadCountB = 0;
  categories.forEach((cat) => {
    const [a, b] = counts[cat.id] || [0, 0];
    if (a > b) leadCountA += 1;
    else if (b > a) leadCountB += 1;
  });
  const champion =
    leadCountA === leadCountB ? null : leadCountA > leadCountB ? 0 : 1;

  return (
    <div className="scoreboard-root">
      <style>{STYLES}</style>

      <div className="sky">
        <Cloud className="bg-cloud c1" />
        <Cloud className="bg-cloud c2" />
        <Cloud className="bg-cloud c3" />
        <Cloud className="bg-cloud c4" />
      </div>

      {confetti.length > 0 && (
        <div className="confetti-layer" aria-hidden="true">
          {confetti.map((p) => (
            <span
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}s`,
                fontSize: `${18 * p.scale}px`,
              }}
            >
              {p.emoji}
            </span>
          ))}
        </div>
      )}

      <div className="content">
        <header className="header">
          <h1>Us vs. Us</h1>
          <p className="subtitle">Keeping score, one silly stat at a time.</p>
        </header>

        {champion !== null && (
          <div className="champion-banner">
            <Crown size={16} />
            <span>
              {names[champion]} is leading {champion === 0 ? leadCountA : leadCountB}{" "}
              {(champion === 0 ? leadCountA : leadCountB) === 1
                ? "category"
                : "categories"}
            </span>
          </div>
        )}

        <div className="players-row">
          {names.map((name, idx) => (
            <div key={idx} className={`player-chip player-${idx === 0 ? "a" : "b"}`}>
              {editingNameIdx === idx ? (
                <div className="name-edit">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitName();
                      if (e.key === "Escape") setEditingNameIdx(null);
                    }}
                    maxLength={16}
                  />
                  <button className="icon-btn" onClick={commitName} aria-label="Save name">
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <button className="name-btn" onClick={() => startEditName(idx)}>
                  <span>{name}</span>
                  <PenLine size={13} className="pen-icon" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="categories">
          {categories.map((cat) => {
            const [a, b] = counts[cat.id] || [0, 0];
            const total = a + b;
            const aPct = total === 0 ? 50 : Math.round((a / total) * 100);
            const leaderIdx = a === b ? null : a > b ? 0 : 1;

            return (
              <div className="cat-card" key={cat.id}>
                <div className="cat-header">
                  <div className="cat-title">
                    {renderIcon(cat.icon, 18, "cat-icon")}
                    <span>{cat.label}</span>
                  </div>
                  {cat.id.startsWith("custom-") && (
                    <button
                      className="icon-btn ghost"
                      onClick={() => removeCategory(cat.id)}
                      aria-label={`Remove ${cat.label}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="cat-bar-track">
                  <div className="cat-bar-fill" style={{ width: `${aPct}%` }} />
                </div>

                <div className="cat-counters">
                  {[0, 1].map((playerIdx) => (
                    <div
                      className={`counter counter-${playerIdx === 0 ? "a" : "b"} ${
                        leaderIdx === playerIdx ? "leading" : ""
                      }`}
                      key={playerIdx}
                    >
                      <span className="counter-name">
                        {leaderIdx === playerIdx && (
                          <Crown size={11} className="mini-crown" />
                        )}
                        {names[playerIdx]}
                      </span>
                      <div className="counter-controls">
                        <button
                          className="step-btn"
                          onClick={() => bump(cat, playerIdx, -1)}
                          aria-label={`Decrease ${cat.label} for ${names[playerIdx]}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span
                          key={counts[cat.id]?.[playerIdx] ?? 0}
                          className="counter-value"
                        >
                          {counts[cat.id]?.[playerIdx] ?? 0}
                        </span>
                        <button
                          className="step-btn"
                          onClick={() => bump(cat, playerIdx, 1)}
                          aria-label={`Increase ${cat.label} for ${names[playerIdx]}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="cat-card add-card">
            <DialogStack open={catDialogOpen} onOpenChange={setCatDialogOpen}>
              <DialogStackOverlay className="add-dialog-overlay" />
              <DialogStackTrigger className="add-trigger">
                <Plus size={18} />
                <span>Track something new</span>
              </DialogStackTrigger>
              <DialogStackBody>
                <DialogStackContent className="add-dialog">
                  <DialogStackHeader>
                    <DialogStackTitle className="add-dialog-title">
                      Track something new
                    </DialogStackTitle>
                    <DialogStackDescription>
                      Give your new stat a name and pick an emoji.
                    </DialogStackDescription>
                  </DialogStackHeader>
                  <div className="add-form">
                    <input
                      autoFocus
                      placeholder="e.g. Who fell asleep first"
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCategory();
                        if (e.key === "Escape") setCatDialogOpen(false);
                      }}
                      maxLength={28}
                    />
                    <div className="emoji-row">
                      {EMOJI_CHOICES.map((em) => (
                        <button
                          key={em}
                          className={`emoji-btn ${newCatIcon === em ? "selected" : ""}`}
                          onClick={() => setNewCatIcon(em)}
                          type="button"
                          aria-label={`Use ${em} icon`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                  <DialogStackFooter>
                    <button
                      className="pill-btn ghost"
                      onClick={() => setCatDialogOpen(false)}
                    >
                      Cancel
                    </button>
                    <button className="pill-btn" onClick={addCategory}>
                      Add
                    </button>
                  </DialogStackFooter>
                </DialogStackContent>
              </DialogStackBody>
            </DialogStack>
          </div>
        </div>

        <div className="footer-actions">
          <button
            className="footer-link"
            onClick={undoLast}
            disabled={!log || log.length === 0}
          >
            <Undo2 size={13} />
            <span>Undo last</span>
          </button>
          <button className="footer-link" onClick={resetAll}>
            <RotateCcw size={13} />
            <span>Clear everything</span>
          </button>
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Chewy&family=Nunito:wght@400;600;700;800&display=swap');

.scoreboard-root {
  position: relative;
  height: 100dvh;
  max-height: 100dvh;
  width: 100%;
  font-family: 'Nunito', sans-serif;
  color: #3E2C33;
  overflow: hidden;
  border-radius: 20px;
}

.sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #FFF8FB 0%, #FFE9F0 55%, #FFD9E6 100%);
  z-index: 0;
}

.bg-cloud {
  position: absolute;
  color: #FFFFFF;
  opacity: 0.85;
  filter: drop-shadow(0 6px 10px rgba(200, 140, 160, 0.15));
}
.c1 { width: 140px; top: 6%; left: -5%; animation: drift 46s linear infinite; }
.c2 { width: 90px; top: 18%; right: -8%; animation: drift 60s linear infinite reverse; }
.c3 { width: 110px; top: 68%; left: -10%; animation: drift 54s linear infinite; animation-delay: -10s; }
.c4 { width: 70px; top: 82%; right: -6%; animation: drift 40s linear infinite reverse; animation-delay: -6s; }

@keyframes drift {
  from { transform: translateX(0); }
  to { transform: translateX(40px); }
}
@media (prefers-reduced-motion: reduce) {
  .bg-cloud { animation: none !important; }
}

.confetti-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  overflow: hidden;
}
.confetti-piece {
  position: absolute;
  top: -10%;
  font-size: 20px;
  animation: fall 1.3s ease-in forwards;
}
@keyframes fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(420px) rotate(200deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .confetti-piece { animation: none; display: none; }
}

.content {
  position: relative;
  z-index: 1;
  max-width: 440px;
  margin: 0 auto;
  padding: 18px 18px 14px;
  height: 100%;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 8px;
}
.header h1 {
  font-family: 'Chewy', cursive;
  font-size: 38px;
  font-weight: 400;
  margin: 0;
  color: #FF2D55;
  transform: rotate(-2deg);
  text-shadow: 0 2px 0 #FFFFFF, 0 4px 12px rgba(255, 45, 85, 0.25);
}
.subtitle {
  margin: 4px auto 0;
  font-size: 12px;
  font-weight: 700;
  color: #8A7480;
  background: rgba(255, 255, 255, 0.75);
  width: fit-content;
  padding: 3px 12px;
  border: 1.5px dashed #F5C6D2;
  border-radius: 999px;
}

.champion-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #FFEFB8;
  color: #7A5A18;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  margin: 0 auto 12px;
  width: fit-content;
  border: 2px solid #F5B942;
  border-bottom-width: 5px;
  box-shadow: 0 5px 0 rgba(245, 185, 66, 0.3);
  transform: rotate(1deg);
  animation: glowPulse 2.4s ease-in-out infinite;
}
.champion-banner svg {
  animation: crownBob 1.8s ease-in-out infinite;
  transform-origin: center;
}

.players-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
}
.player-chip {
  background: #FFFFFF;
  border-radius: 999px;
  padding: 6px 4px 6px 12px;
  box-shadow: 0 4px 14px rgba(200, 130, 150, 0.16);
  display: flex;
  align-items: center;
  border: 2px solid transparent;
  border-bottom-width: 5px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.player-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(200, 130, 150, 0.22);
}
.player-a { border-color: #FF2D55; transform: rotate(-1.5deg); }
.player-b { border-color: #6FB3D9; transform: rotate(1.5deg); }

.name-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-family: 'Chewy', cursive;
  font-size: 16px;
  color: #3E2C33;
  cursor: pointer;
  padding: 2px 6px 2px 2px;
}
.pen-icon {
  color: #C9A8B4;
  opacity: 0.35;
  transition: opacity 0.15s ease;
}
.player-chip:hover .pen-icon { opacity: 1; }

.name-edit {
  display: flex;
  align-items: center;
  gap: 6px;
}
.name-edit input {
  font-family: 'Chewy', cursive;
  font-size: 16px;
  border: none;
  outline: none;
  width: 90px;
  background: #FFF6F8;
  border-radius: 999px;
  padding: 4px 10px;
}

.icon-btn {
  border: none;
  background: #FFE9EE;
  color: #FF2D55;
  border-radius: 999px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.icon-btn.ghost {
  background: transparent;
  color: #C9A8B4;
  width: 24px;
  height: 24px;
}

.categories {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cat-card {
  background: #FFFFFF;
  border-radius: 18px;
  padding: 12px 14px 12px;
  border: 2px solid rgba(255, 45, 85, 0.12);
  box-shadow: 0 8px 22px rgba(255, 45, 85, 0.1);
  animation: rise 0.32s ease both;
}
.cat-card:nth-child(2) { animation-delay: 0.03s; }
.cat-card:nth-child(3) { animation-delay: 0.06s; }
.cat-card:nth-child(4) { animation-delay: 0.09s; }
.cat-card:nth-child(5) { animation-delay: 0.12s; }

.cat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.cat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Chewy', cursive;
  font-size: 16px;
}
.cat-icon { color: #FF2D55; flex-shrink: 0; }

.cat-bar-track {
  height: 8px;
  border-radius: 999px;
  background: #FFE9EE;
  border: 1px solid #FFD6E0;
  overflow: hidden;
  margin-bottom: 10px;
}
.cat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF2D55, #FF7A95);
  border-radius: 999px;
  transition: width 0.35s ease;
}

.cat-counters {
  display: flex;
  gap: 8px;
}
.counter {
  flex: 1;
  border-radius: 14px;
  padding: 7px 8px 8px;
  background: #FFF6F8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 1.5px solid #F5C6D2;
  transition: box-shadow 0.2s ease;
}
.counter-b { background: #F1F9FE; border-color: #C7DFF0; }
.counter.leading {
  background: #FFF6E3;
  box-shadow: 0 0 0 2px #F5B942 inset, 0 4px 10px rgba(245, 185, 66, 0.25);
}

.counter-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #8A7480;
}
.mini-crown {
  color: #E8A621;
  animation: crownBob 1.8s ease-in-out infinite;
}

.counter-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.counter-value {
  display: inline-block;
  font-family: 'Chewy', cursive;
  font-size: 19px;
  min-width: 20px;
  text-align: center;
  animation: pop 0.22s ease;
}
.step-btn {
  width: 27px;
  height: 27px;
  border-radius: 999px;
  border: 2px solid #FF2D55;
  border-bottom-width: 4px;
  background: #FFFFFF;
  color: #FF2D55;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.1s ease, background 0.15s ease;
}
.step-btn:hover { transform: translateY(-1px); background: #FFF0F3; }
.step-btn:active { transform: translateY(2px); border-bottom-width: 2px; }
.counter-b .step-btn {
  border-color: #6FB3D9;
  border-bottom-color: #4E94BF;
  color: #6FB3D9;
}
.counter-b .step-btn:hover { background: #EFF8FF; }

.add-card {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(255, 45, 85, 0.25);
  box-shadow: none;
  background: rgba(255,255,255,0.5);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}
.add-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 45, 85, 0.5);
  background: rgba(255,255,255,0.8);
}
.add-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: auto;
  background: none;
  color: #FF2D55;
  font-family: 'Chewy', cursive;
  font-size: 15px;
  cursor: pointer;
  padding: 8px 10px;
  border: none;
  border-radius: 999px;
  transition: transform 0.15s ease, background 0.15s ease;
}
.add-trigger:hover { background: #FFF6F8; transform: scale(1.03); }

.add-dialog-overlay { background: rgba(62, 44, 51, 0.5) !important; }

.add-dialog {
  border-radius: 24px !important;
  border: 2px solid #FFD6E0 !important;
  box-shadow: 0 10px 30px rgba(255, 45, 85, 0.18) !important;
}
.add-dialog-title {
  font-family: 'Chewy', cursive;
  font-weight: 400;
  font-size: 22px;
  line-height: 1.2;
  color: #FF2D55;
}
.add-dialog > div { padding-top: 10px; }

.add-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.add-form input {
  border: 1px solid #F3C6D2;
  border-radius: 12px;
  padding: 10px 12px;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  outline: none;
}
.add-form input:focus { border-color: #FF2D55; }
.emoji-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.emoji-btn {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid #F3C6D2;
  background: #FFFFFF;
  font-size: 15px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
}
.emoji-btn:hover { transform: scale(1.12); }
.emoji-btn.selected {
  border-color: #FF2D55;
  background: #FFE9EE;
}
.pill-btn {
  border: 2px solid #FF2D55;
  border-bottom: 4px solid #E02046;
  background: #FF2D55;
  color: #FFFFFF;
  border-radius: 999px;
  padding: 7px 16px;
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.pill-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255, 45, 85, 0.3); }
.pill-btn:active { transform: translateY(2px); border-bottom-width: 2px; box-shadow: none; }
.pill-btn.ghost {
  background: transparent;
  color: #8A7480;
  border-color: #F5C6D2;
  border-bottom-color: #F5C6D2;
}

.footer-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 12px;
}
.footer-link {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #B98A97;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s ease;
}
.footer-link:hover:not(:disabled) { color: #FF2D55; }
.footer-link:disabled {
  opacity: 0.4;
  cursor: default;
}

.step-btn:focus-visible,
.pill-btn:focus-visible,
.footer-link:focus-visible,
.add-trigger:focus-visible,
.icon-btn:focus-visible,
.emoji-btn:focus-visible,
.name-btn:focus-visible {
  outline: 2px solid #FF2D55;
  outline-offset: 2px;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@keyframes pop {
  0% { transform: scale(0.82); }
  45% { transform: scale(1.22); }
  100% { transform: scale(1); }
}
@keyframes crownBob {
  0%, 100% { transform: translateY(0) rotate(-6deg); }
  50% { transform: translateY(-2px) rotate(6deg); }
}
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 5px 0 rgba(245, 185, 66, 0.3); }
  50% { box-shadow: 0 5px 0 rgba(245, 185, 66, 0.55), 0 0 18px rgba(245, 185, 66, 0.4); }
}
@keyframes floaty {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@media (max-height: 720px) {
  .content { padding-top: 10px; padding-bottom: 8px; }
  .header { margin-bottom: 4px; }
  .header h1 { font-size: 32px; }
  .subtitle { display: none; }
  .champion-banner { margin-bottom: 8px; padding: 5px 10px; }
  .players-row { margin-bottom: 10px; }
  .categories { gap: 8px; }
  .cat-card { padding: 9px 12px 9px; }
  .cat-header { margin-bottom: 6px; }
  .cat-title { font-size: 15px; }
  .cat-bar-track { height: 7px; margin-bottom: 8px; }
  .counter-name { font-size: 10px; }
  .step-btn { width: 24px; height: 24px; }
  .counter-value { font-size: 16px; }
  .bg-cloud { opacity: 0.5; }
  .footer-actions { margin-top: 8px; }
  .footer-link { font-size: 11px; }
}

.scoreboard-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  background: linear-gradient(180deg, #FFF8FB 0%, #FFD9E6 100%);
}
.loading-cloud {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #B98A97;
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
}
.loading-cloud span { animation: pulse 1.6s ease-in-out infinite; }
.cloud-icon {
  width: 60px;
  color: #FFFFFF;
  filter: drop-shadow(0 4px 8px rgba(200,130,150,0.2));
  animation: floaty 2.6s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .bg-cloud, .confetti-piece, .cat-card, .counter-value, .champion-banner,
  .champion-banner svg, .mini-crown, .cloud-icon,
  .loading-cloud span { animation: none !important; }
}
`;
