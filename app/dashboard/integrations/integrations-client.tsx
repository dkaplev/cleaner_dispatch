"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IntegrationsClient({ forwardingAddress }: { forwardingAddress: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(forwardingAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function regenerate() {
    setRegenerating(true);
    setShowConfirm(false);
    try {
      const res = await fetch("/api/account/ingest-token", { method: "POST" });
      if (res.ok) router.refresh();
      else alert("Failed to regenerate. Please try again.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm break-all text-zinc-800">
          {forwardingAddress}
        </code>
        <button
          type="button"
          onClick={copyAddress}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div>
        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="text-xs text-zinc-400 underline hover:text-zinc-600 hover:no-underline"
          >
            Regenerate address
          </button>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Are you sure?</p>
            <p className="mt-0.5 text-xs">
              Your old forwarding address will stop working. You&apos;ll need to update the Gmail
              filter with the new address.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={regenerate}
                disabled={regenerating}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {regenerating ? "Regenerating…" : "Yes, regenerate"}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
