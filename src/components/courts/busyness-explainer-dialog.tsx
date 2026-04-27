"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  baselineFormulaTerms,
  busynessFormulaSteps,
  crowdCalculationFactors,
  crowdScoreBands,
  reportLevelValues,
} from "@/lib/crowd-explainer";
import { cn } from "@/lib/utils";

type BusynessExplainerDialogProps = {
  compact?: boolean;
  className?: string;
};

export function BusynessExplainerDialog({ compact = false, className }: BusynessExplainerDialogProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size={compact ? "icon" : "sm"}
        className={cn("bg-background/85", className)}
        aria-label="How busyness is calculated"
        disabled={!mounted}
        onClick={() => setOpen(true)}
      >
        <HelpCircle data-icon={compact ? undefined : "inline-start"} />
        {compact ? <span className="sr-only">How busyness is calculated</span> : "How it works"}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="busyness-explainer-title"
        >
          <div className="dink-panel max-h-[min(760px,calc(100dvh-2rem))] w-full max-w-2xl overflow-y-auto rounded-t-lg border bg-popover p-4 text-sm shadow-xl sm:rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <h2 id="busyness-explainer-title" className="text-lg font-semibold">
                  How busyness is calculated
                </h2>
                <p className="text-sm text-muted-foreground">
                  DinkMap uses a transparent rules model plus verified nearby player reports. It does not use Google
                  phone location data, and it is an estimate rather than an official occupancy count.
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close busyness explanation" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>

            <div className="mt-5 flex flex-col gap-5">
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Inputs</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {crowdCalculationFactors.map((factor) => (
                    <div key={factor.title} className="rounded-md border bg-card/70 p-3">
                      <div className="text-sm font-medium">{factor.title}</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Baseline formula</h3>
                <p className="text-sm text-muted-foreground">
                  The model starts at 18, adds or subtracts the active adjustments below, then clamps the result to
                  0-100.
                </p>
                <div className="flex flex-wrap gap-2">
                  {baselineFormulaTerms.map((term) => (
                    <Badge key={term.label + term.value} variant="outline" className="bg-background/80">
                      {term.label}: {term.value}
                    </Badge>
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Report values</h3>
                <p className="text-sm text-muted-foreground">
                  Nearby reports are converted to numeric values before the recency-weighted average is calculated.
                </p>
                <div className="flex flex-wrap gap-2">
                  {reportLevelValues.map((level) => (
                    <Badge key={level.label} variant="secondary" className="border border-border bg-secondary/70">
                      {level.label}: {level.value}
                    </Badge>
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Statistical method</h3>
                {busynessFormulaSteps.map((step) => (
                  <div key={step.title} className="rounded-md border bg-card/70 p-3">
                    <div className="text-sm font-medium">{step.title}</div>
                    <code className="mt-2 block rounded-md bg-muted px-2 py-1.5 text-xs leading-relaxed text-foreground">
                      {step.formula}
                    </code>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
                  </div>
                ))}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Labels and confidence</h3>
                <div className="flex flex-wrap gap-2">
                  {crowdScoreBands.map((band) => (
                    <Badge key={band.label} variant="outline" className="bg-background/80">
                      {band.label}: {band.range}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Confidence is &quot;Model only&quot; with no fresh reports, &quot;Fresh&quot; with one or two fresh reports, and
                  &quot;High&quot; with three or more fresh reports. Reports require browser location within 300 meters of the
                  court; exact coordinates are used for verification and are not stored.
                </p>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
