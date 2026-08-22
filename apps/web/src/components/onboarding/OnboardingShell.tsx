"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { JourneyProgress } from "@/components/ui/JourneyProgress";

type JourneyStep = {
  label: string;
};

interface OnboardingShellProps {
  children: ReactNode;
  headerActions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  steps?: JourneyStep[];
  activeIndex?: number;
  contentClassName?: string;
  bodyClassName?: string;
}

export default function OnboardingShell({
  children,
  headerActions,
  backHref,
  backLabel = "Back",
  steps,
  activeIndex = 0,
  contentClassName,
  bodyClassName,
}: OnboardingShellProps) {
  return (
    <section className="ui-page-shell relative flex min-h-full flex-1 flex-col overflow-auto">
      <div className="ui-page-backdrop" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[color:var(--ui-border-soft)]" />

      <div className={cn("relative z-10 mx-auto flex w-full max-w-[1560px] flex-1 flex-col px-6 py-6 sm:px-8 lg:px-10", bodyClassName)}>
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[color:var(--ui-color-primary)]/10 border border-[color:var(--ui-color-primary)]/20 shadow-lg">
              <Sparkles size={18} className="text-[color:var(--ui-color-primary)]" />
            </span>
            <span className="text-base font-bold tracking-tight text-[color:var(--ui-color-text)]">STEMAIDE IDE</span>
          </Link>

          <div className="flex items-center gap-3">
            {headerActions}
            <ThemeToggle className="ui-foundation-panel-quiet text-[color:var(--ui-color-text)] hover:border-[color:var(--ui-border-strong)]" showLabel />
          </div>
        </div>

        {(backHref || steps?.length) ? (
          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              {backHref ? (
                <Link
                  href={backHref}
                  className="ui-foundation-panel-quiet inline-flex min-h-[46px] items-center gap-2 px-5 py-2.5 text-sm font-bold tracking-tight text-[color:var(--ui-color-text)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <ArrowLeft size={16} />
                  {backLabel}
                </Link>
              ) : null}
            </div>

            {steps?.length ? (
              <JourneyProgress steps={steps} activeIndex={activeIndex} tone="immersive" className="justify-start lg:justify-end" />
            ) : null}
          </div>
        ) : null}

        <div className={cn("flex flex-1 flex-col", contentClassName)}>{children}</div>
      </div>
    </section>
  );
}
