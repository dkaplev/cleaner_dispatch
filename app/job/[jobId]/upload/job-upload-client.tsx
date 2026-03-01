"use client";

import { useState } from "react";

export function JobUploadClient({ token, jobId }: { token: string; jobId: string }) {
  const [uploading, setUploading] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [fileList, setFileList] = useState<FileList | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fileList?.length) {
      setMessage({ type: "err", text: "Select at least one photo." });
      return;
    }
    setMessage(null);
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        formData.append("photos", fileList[i]);
      }
      const res = await fetch(`/api/job-upload?token=${encodeURIComponent(token)}`, {
        method: "POST",
        body: formData,
      });
      let data: { error?: string; uploaded?: number } = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as { error?: string; uploaded?: number };
      } catch {
        // non-JSON response (e.g. 500 error page)
      }
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || `Upload failed (${res.status})` });
        return;
      }
      setMessage({ type: "ok", text: `${data.uploaded ?? 0} photo(s) uploaded.` });
      setFileList(null);
      const input = document.getElementById("photos") as HTMLInputElement;
      if (input) input.value = "";
    } finally {
      setUploading(false);
    }
  }

  async function handleMarkDone() {
    setMessage(null);
    setMarkingDone(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/mark-done`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Failed to mark done" });
        return;
      }
      setMessage({ type: "ok", text: "Job marked done. Your landlord will review and rate you." });
    } finally {
      setMarkingDone(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      {message && (
        <p
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${message.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
          role="alert"
        >
          {message.text}
        </p>
      )}
      <label htmlFor="photos" className="block text-sm font-medium text-zinc-700">
        Select photos (JPEG, PNG, WebP, GIF — max 10MB each)
      </label>
      <input
        id="photos"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={(e) => setFileList(e.target.files)}
        className="mt-2 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-zinc-800"
      />
      <button
        type="submit"
        disabled={uploading || !fileList?.length}
        className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload photos"}
      </button>

      <div className="mt-6 border-t border-zinc-200 pt-6">
        <p className="text-sm text-zinc-600">
          When you've uploaded at least one photo and finished the cleaning, mark the job as done.
        </p>
        <button
          type="button"
          onClick={handleMarkDone}
          disabled={markingDone}
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {markingDone ? "Sending…" : "Mark job as done"}
        </button>
      </div>
    </form>
  );
}
