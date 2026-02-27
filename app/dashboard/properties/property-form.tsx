"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props =
  | { action: "create" }
  | {
      action: "edit";
      id: string;
      initialName: string;
      initialCheckoutTime: string;
      initialDuration: string | number;
      initialInstructions: string;
    };

export function PropertyForm(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = props.action === "edit";
  const [name, setName] = useState(isEdit ? props.initialName : "");
  const [checkoutTime, setCheckoutTime] = useState(isEdit ? props.initialCheckoutTime : "");
  const [duration, setDuration] = useState(
    isEdit ? String(props.initialDuration) : ""
  );
  const [instructions, setInstructions] = useState(
    isEdit ? props.initialInstructions : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        instructions_text: instructions.trim() || null,
      };
      // Store as full datetime with fixed date; only the time part is used for scheduling
      if (checkoutTime) body.checkout_time_default = `2000-01-01T${checkoutTime}:00`;
      if (duration !== "") {
        const n = parseInt(duration, 10);
        if (!Number.isNaN(n) && n > 0) body.cleaning_duration_minutes = n;
      }

      const url = isEdit ? `/api/properties/${props.id}` : "/api/properties";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push("/dashboard/properties");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
          Name *
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="checkout_time" className="block text-sm font-medium text-zinc-700">
          Default checkout time
        </label>
        <p className="mt-0.5 text-xs text-zinc-500">
          When guests usually leave (e.g. 11:00). Used to schedule cleanings: cleaner is expected to start around this time; together with duration it defines the cleaning window.
        </p>
        <input
          id="checkout_time"
          type="time"
          value={checkoutTime}
          onChange={(e) => setCheckoutTime(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="duration" className="block text-sm font-medium text-zinc-700">
          Cleaning duration (minutes)
        </label>
        <input
          id="duration"
          type="number"
          min={1}
          placeholder="e.g. 120"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-zinc-700">
          Instructions
        </label>
        <textarea
          id="instructions"
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Saving…" : isEdit ? "Save changes" : "Add property"}
        </button>
        <Link
          href="/dashboard/properties"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
