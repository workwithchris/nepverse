import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <section className="relative mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl bg-[#14382f] px-7 py-10 text-white sm:mt-16 sm:px-12 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-radial-gradient(ellipse at 94% 10%, transparent 0 35px, rgba(255,255,255,.18) 36px 37px)',
        }}
      />
      <div className="relative">
        <span className="flex size-12 items-center justify-center rounded-xl border border-white/25 bg-white/10">
          <Compass className="size-6" aria-hidden="true" />
        </span>
        <div className="mt-10 flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-[#a9d9c4] uppercase">
          <span>404</span>
          <span className="h-px w-6 bg-white/30" aria-hidden="true" />
          Off the map
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
          This location isn&apos;t on the atlas. Find your way back to places
          and trails worth exploring.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-[#14382f] transition-colors hover:bg-[#e9f4ee] focus-visible:outline-[#a9d9c4]"
          >
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
          <Link
            to="/trails"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 px-4 py-2.5 text-sm text-white transition-colors hover:bg-white/10 focus-visible:outline-[#a9d9c4]"
          >
            Explore trails <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
