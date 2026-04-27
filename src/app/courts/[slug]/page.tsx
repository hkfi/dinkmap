import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Accessibility,
  ArrowLeft,
  Clock,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { BusynessExplainerDialog } from "@/components/courts/busyness-explainer-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { courts, getCourtDetail } from "@/lib/court-service";
import { crowdScoreBands } from "@/lib/crowd-explainer";
import type { CrowdLevel } from "@/lib/types";
import { getNycWeather } from "@/lib/weather";

const crowdColors: Record<CrowdLevel, string> = {
  Low: "#19b86a",
  Moderate: "#f4bf35",
  Busy: "#ff7b39",
  Packed: "#e63f5f",
};

export function generateStaticParams() {
  return courts.map((court) => ({ slug: court.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const court = courts.find((item) => item.slug === slug);
  if (!court) return {};
  return {
    title: court.name,
    description: `Crowd estimate, conditions, and verified reports for ${court.name} (${court.borough}).`,
  };
}

export default async function CourtPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const weather = await getNycWeather();
  const court = await getCourtDetail(slug, weather);

  if (!court) notFound();

  const directionsUrl = `https://www.openstreetmap.org/directions?to=${court.latitude}%2C${court.longitude}`;
  const dotColor = crowdColors[court.crowd.level];
  const score = Math.max(0, Math.min(100, court.crowd.score));

  return (
    <main className="min-h-dvh px-4 py-5 md:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href="/"
          >
            <ArrowLeft data-icon="inline-start" />
            Back to map
          </Link>
          <Badge variant="outline" className="bg-background/70">
            <Clock data-icon="inline-start" />
            {new Date(court.crowd.updatedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Badge>
        </div>

        <Card className="dink-floating-card dink-panel">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className="border border-border bg-secondary/80"
              >
                {court.borough}
              </Badge>
              {court.permitRequired ? (
                <Badge
                  variant="outline"
                  className="border-yellow-300 bg-yellow-50 text-yellow-900"
                >
                  Permit
                </Badge>
              ) : null}
              {court.accessible ? (
                <Badge
                  variant="secondary"
                  className="border border-border bg-secondary/80"
                >
                  <Accessibility data-icon="inline-start" />
                  Accessible
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              {court.name}
            </CardTitle>
            <CardDescription className="text-sm">
              {court.location}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Hero crowd display */}
            <section className="rounded-xl border border-border/60 bg-accent/25 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Right now
                  </div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <div className="text-4xl font-bold tracking-tight">
                      {court.crowd.level}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {score}/100 busyness
                    </div>
                  </div>
                </div>
                <span
                  aria-hidden
                  className="dink-pulse mt-1 size-3 rounded-full"
                  style={{ background: dotColor, color: dotColor }}
                />
              </div>

              <div className="dink-meter mt-4">
                <div
                  className="dink-meter-fill"
                  style={{ width: `${Math.max(6, score)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                {crowdScoreBands.map((band) => (
                  <span key={band.label}>{band.label}</span>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="dink-stat rounded-lg border p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Nets
                </div>
                <div className="mt-0.5 text-xl font-bold">
                  {court.courtCount}
                </div>
              </div>
              <div className="dink-stat rounded-lg border p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Permit
                </div>
                <div className="mt-0.5 text-xl font-bold">
                  {court.permitRequired ? "Yes" : "No"}
                </div>
              </div>
              <div className="dink-stat rounded-lg border p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Signal
                </div>
                <div className="mt-0.5 text-xl font-bold">
                  {court.crowd.confidence}
                </div>
              </div>
              <div className="dink-stat rounded-lg border p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Accessible
                </div>
                <div className="mt-0.5 text-xl font-bold">
                  {court.accessible ? "Yes" : "—"}
                </div>
              </div>
            </div>

            <Separator />

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <Sparkles className="size-4" />
                  Why this estimate
                </h2>
                <BusynessExplainerDialog />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {court.crowd.reasons.join(" · ")}
              </p>
              <p className="text-xs text-muted-foreground">
                Updated{" "}
                {new Date(court.crowd.updatedAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                . Recent reports influence the estimate for up to two hours.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Users className="size-4" />
                Latest reports
              </h2>
              {court.reports.length ? (
                <div className="flex flex-col gap-2">
                  {court.reports.slice(0, 5).map((report) => (
                    <div
                      key={report.id}
                      className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                    >
                      <span
                        className="mt-1 size-2.5 shrink-0 rounded-full"
                        style={{ background: crowdColors[report.level] }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{report.level}</div>
                        <div className="text-xs text-muted-foreground">
                          {report.waitingCount !== undefined
                            ? `${report.waitingCount} waiting · `
                            : ""}
                          {report.openCourts !== undefined
                            ? `${report.openCourts} open courts · `
                            : ""}
                          {new Date(report.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No fresh verified reports yet.
                </p>
              )}
            </section>

            <div className="grid gap-2 sm:grid-cols-2">
              <a
                className={buttonVariants()}
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin data-icon="inline-start" />
                Directions
                <ExternalLink data-icon="inline-end" />
              </a>
              <Link
                className={buttonVariants({ variant: "outline" })}
                href="/"
              >
                <ShieldCheck data-icon="inline-start" />
                Report from map
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-center gap-1.5 pb-6 text-xs text-muted-foreground">
          <span>Court data via NYC Parks &amp; community guide.</span>
          <span aria-hidden>·</span>
          <span>Weather via Open-Meteo.</span>
        </div>
      </div>
    </main>
  );
}
