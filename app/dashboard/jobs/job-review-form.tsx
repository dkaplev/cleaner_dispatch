"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TAGS = [
  { value: "late", label: "Late" },
  { value: "low_quality", label: "Low quality" },
  { value: "missing_photos", label: "Missing photos" },
  { value: "communication", label: "Communication issues" },
  { value: "excellent", label: "Excellent" },
];

type Props = {
  jobId: string;
  cleanerName: string;
  media: { id: string }[];
};

export function JobReviewForm({ jobId, cleanerName, media }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  function toggleTag(value: string) {
    setTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Please select a rating 1–5.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating_1_5: rating,
          tags,
          comment_optional: comment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save review");
        return;
      }
      router.push("/dashboard/cleanings");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-zinc-900">Review cleaner</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Rate <strong>{cleanerName}</strong> and mark the job complete.
      </p>

      {media.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-zinc-700">Photos ({media.length})</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {media.map((m) => (
              <a
                key={m.id}
                href={`/api/job-media/${m.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                View photo
              </a>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-700">Rating (1–5) *</label>
          <div className="mt-1 flex gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRating(r)}
                className={`h-10 w-10 rounded-lg border text-sm font-medium ${
                  rating === r
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Tags (optional)</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <label key={t.value} className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={tags.includes(t.value)}
                  onChange={() => toggleTag(t.value)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                />
                <span className="text-sm text-zinc-700">{t.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-zinc-700">
            Comment (optional)
          </label>
          <textarea
            id="comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            maxLength={2000}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Submit review & complete job"}
        </button>
      </form>
    </div>
  );
}
