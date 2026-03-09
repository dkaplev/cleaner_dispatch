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
      initialCheckinTime: string;
      initialDuration: string | number;
      initialInstructions: string;
      initialCleaningTrigger: string;
      initialNameBookingCom?: string;
      initialNameAirbnb?: string;
      initialNameVrbo?: string;
    };

export function PropertyForm(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = props.action === "edit";
  const [name, setName] = useState(isEdit ? props.initialName : "");
  const [checkoutTime, setCheckoutTime] = useState(isEdit ? props.initialCheckoutTime : "");
  const [checkinTime, setCheckinTime] = useState(isEdit ? props.initialCheckinTime : "");
  const [cleaningTrigger, setCleaningTrigger] = useState(
    isEdit ? props.initialCleaningTrigger : "after_checkout"
  );
  const [duration, setDuration] = useState(
    isEdit ? String(props.initialDuration) : ""
  );
  const [instructions, setInstructions] = useState(
    isEdit ? props.initialInstructions : ""
  );
  const [nameBookingCom, setNameBookingCom] = useState(
    isEdit && "initialNameBookingCom" in props ? (props.initialNameBookingCom ?? "") : ""
  );
  const [nameAirbnb, setNameAirbnb] = useState(
    isEdit && "initialNameAirbnb" in props ? (props.initialNameAirbnb ?? "") : ""
  );
  const [nameVrbo, setNameVrbo] = useState(
    isEdit && "initialNameVrbo" in props ? (props.initialNameVrbo ?? "") : ""
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
      body.cleaning_trigger = cleaningTrigger;
      // Store as full datetime with fixed date; only the time part is used for scheduling
      if (checkoutTime) body.checkout_time_default = `2000-01-01T${checkoutTime}:00`;
      if (checkinTime) body.checkin_time_default = `2000-01-01T${checkinTime}:00`;
      if (duration !== "") {
        const n = parseInt(duration, 10);
        if (!Number.isNaN(n) && n > 0) body.cleaning_duration_minutes = n;
      }
      if (isEdit) {
        body.name_booking_com = nameBookingCom.trim() || null;
        body.name_airbnb = nameAirbnb.trim() || null;
        body.name_vrbo = nameVrbo.trim() || null;
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
        <label htmlFor="cleaning_trigger" className="block text-sm font-medium text-zinc-700">
          When to clean
        </label>
        <p className="mt-0.5 text-xs text-zinc-500">
          Choose whether cleaning should happen after guest check-out, before the next check-in, or both.
        </p>
        <select
          id="cleaning_trigger"
          value={cleaningTrigger}
          onChange={(e) => setCleaningTrigger(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="after_checkout">After check-out</option>
          <option value="before_checkin">Before check-in</option>
          <option value="both">Both (after check-out + before check-in)</option>
        </select>
      </div>
      {(cleaningTrigger === "after_checkout" || cleaningTrigger === "both") && (
        <div>
          <label htmlFor="checkout_time" className="block text-sm font-medium text-zinc-700">
            Default checkout time
          </label>
          <p className="mt-0.5 text-xs text-zinc-500">
            When guests usually leave (e.g. 11:00). The cleaning window starts at this time.
          </p>
          <input
            id="checkout_time"
            type="time"
            value={checkoutTime}
            onChange={(e) => setCheckoutTime(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      )}
      {(cleaningTrigger === "before_checkin" || cleaningTrigger === "both") && (
        <div>
          <label htmlFor="checkin_time" className="block text-sm font-medium text-zinc-700">
            Default check-in time
          </label>
          <p className="mt-0.5 text-xs text-zinc-500">
            When the next guest arrives (e.g. 15:00). The cleaning window must end by this time.
          </p>
          <input
            id="checkin_time"
            type="time"
            value={checkinTime}
            onChange={(e) => setCheckinTime(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      )}
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
      {isEdit && (
        <>
          <p className="text-sm font-medium text-zinc-700">Channel names (for import matching)</p>
          <p className="text-xs text-zinc-500">
            Set the exact name as shown on each platform so pasted/forwarded booking confirmations can auto-select this property.
          </p>
          <div>
            <label htmlFor="name_booking_com" className="block text-xs text-zinc-600">Booking.com property name</label>
            <input
              id="name_booking_com"
              type="text"
              placeholder="e.g. Sunset Villa Paphos"
              value={nameBookingCom}
              onChange={(e) => setNameBookingCom(e.target.value)}
              className="mt-0.5 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="name_airbnb" className="block text-xs text-zinc-600">Airbnb listing name</label>
            <input
              id="name_airbnb"
              type="text"
              placeholder="e.g. Charming Sea View Apartment, Limassol"
              value={nameAirbnb}
              onChange={(e) => setNameAirbnb(e.target.value)}
              className="mt-0.5 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="name_vrbo" className="block text-xs text-zinc-600">Vrbo property name</label>
            <input
              id="name_vrbo"
              type="text"
              placeholder="e.g. Luxury Beachfront Villa — Ayia Napa"
              value={nameVrbo}
              onChange={(e) => setNameVrbo(e.target.value)}
              className="mt-0.5 block w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
            />
          </div>
        </>
      )}
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
