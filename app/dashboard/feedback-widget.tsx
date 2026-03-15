"use client";

import { useEffect, useState } from "react";

type FeedbackItem = {
  id: string;
  category: string;
  message: string;
  created_at: string;
};

const CATEGORIES = [
  { value: "general",     label: "💬 General feedback" },
  { value: "bug",         label: "🐛 Something isn't working" },
  { value: "feature",     label: "💡 Feature suggestion" },
  { value: "testimonial", label: "⭐ Testimonial / review" },
];

const CATEGORY_LABELS: Record<string, string> = {
  general:     "General",
  bug:         "Bug",
  feature:     "Feature request",
  testimonial: "Testimonial",
};

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) setHistory(await res.json());
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to submit"); return; }
      setDone(true);
      setMessage("");
      loadHistory();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-[#e5dfd4] bg-[#fdfcf9] overflow-hidden">
      {/* header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-[#3c3732]">Share feedback or a suggestion</p>
          <p className="mt-0.5 text-xs text-[#7d7570]">
            Tell us what&apos;s working, what&apos;s not, or what you&apos;d love to see next.
          </p>
        </div>
        <span className={`ml-4 shrink-0 text-[#9a9089] text-lg transition-transform ${open ? "rotate-45" : ""}`}>
          +
        </span>
      </button>

      {/* expandable body */}
      {open && (
        <div className="border-t border-[#e5dfd4] px-6 pb-6 pt-5">
          {done ? (
            <div className="rounded-xl border border-[#ddd6cb] bg-[#f5f1ea] px-4 py-4">
              <p className="text-sm font-medium text-[#3c3732]">Thank you! 🙏</p>
              <p className="mt-1 text-xs text-[#7d7570]">
                Your feedback has been received. We read every message.
              </p>
              <button
                onClick={() => setDone(false)}
                className="mt-3 text-xs text-[#4b443e] underline decoration-[#c5bdb4] hover:no-underline"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-[#4a443e]">Type</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-[#ddd6cb] bg-[#fdfcf9] px-4 py-2.5 text-sm text-[#3f3a35] focus:border-[#9a9089] focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4a443e]">Message *</label>
                <textarea
                  required
                  minLength={5}
                  maxLength={2000}
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    category === "bug"
                      ? "Describe what happened and what you expected to happen…"
                      : category === "feature"
                      ? "Describe the feature and how it would help you…"
                      : category === "testimonial"
                      ? "Share your experience with Cleaner Dispatch…"
                      : "What's on your mind?"
                  }
                  className="mt-1.5 block w-full rounded-xl border border-[#ddd6cb] bg-[#fdfcf9] px-4 py-3 text-sm text-[#3f3a35] placeholder:text-[#b0a89f] focus:border-[#9a9089] focus:outline-none resize-none"
                />
                <p className="mt-1 text-right text-[10px] text-[#b0a89f]">{message.length}/2000</p>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#4b443e] px-5 py-2.5 text-sm font-medium text-[#f8f6f1] transition hover:bg-[#3f3934] disabled:opacity-40"
              >
                {saving ? "Sending…" : "Send feedback →"}
              </button>
            </form>
          )}

          {/* submission history */}
          {history.length > 0 && (
            <div className="mt-6 border-t border-[#e5dfd4] pt-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-[#6a625c]">
                Your previous messages
              </p>
              {loadingHistory ? (
                <p className="text-xs text-[#9a9089]">Loading…</p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#e3dcd1] bg-[#f8f4ef] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[#ece5dc] px-2 py-0.5 text-[10px] font-medium text-[#4b443e]">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                        <span className="text-[10px] text-[#9a9089]">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-[#5d554f] line-clamp-3">{item.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
