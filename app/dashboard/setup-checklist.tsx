import Link from "next/link";

type ChecklistItem = {
  label: string;
  done: boolean;
  href: string;
  cta: string;
  optional?: boolean;
};

type Props = {
  items: ChecklistItem[];
};

export function SetupChecklist({ items }: Props) {
  const required = items.filter((i) => !i.optional);
  if (required.every((i) => i.done)) return null;

  const nextIncomplete = items.find((i) => !i.done);
  const doneCount = required.filter((i) => i.done).length;

  return (
    <div className="rounded-3xl border border-[#e5dfd4] bg-[#fdfcf9] p-6 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">
            Setup — {doneCount} of {required.length} done
          </p>
          <h3 className="mt-1.5 text-base font-semibold text-[#3c3732]">
            Complete your account setup
          </h3>
          <p className="mt-0.5 text-sm text-[#5d554f]">
            A few quick steps before jobs are dispatched automatically.
          </p>
        </div>
        {nextIncomplete && (
          <Link
            href={nextIncomplete.href}
            className="shrink-0 self-start rounded-full bg-[#4b443e] px-5 py-2.5 text-sm font-medium text-[#f8f6f1] transition hover:bg-[#3f3934]"
          >
            Continue setup →
          </Link>
        )}
      </div>

      <ul className="mt-5 space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition
                ${item.done
                  ? "bg-[#4b443e] text-[#f8f6f1]"
                  : "border-2 border-[#ddd6cb] bg-[#f5f1ea] text-transparent"
                }`}
            >
              ✓
            </span>
            <span
              className={`flex-1 text-sm ${item.done ? "text-[#9a9089] line-through decoration-[#c5bdb4]" : "text-[#4a443e]"}`}
            >
              {item.label}
              {item.optional && !item.done && (
                <span className="ml-2 text-xs text-[#9a9089]">(optional)</span>
              )}
            </span>
            {!item.done && (
              <Link
                href={item.href}
                className="text-xs text-[#5f5751] underline decoration-[#c5bdb4] hover:text-[#3c3732] transition"
              >
                {item.cta} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
