export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-50">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Cleaner Dispatch
      </h1>
      <p className="mt-2 text-zinc-600">
        MVP — Landlord sign up, sign in, and protected dashboard.
      </p>
      <p className="mt-4 flex gap-3">
        <a href="/login" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">Sign in</a>
        <a href="/signup" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Sign up</a>
      </p>
    </div>
  );
}
