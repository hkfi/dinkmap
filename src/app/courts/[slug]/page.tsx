import Link from "next/link";
import { notFound } from "next/navigation";
import { Accessibility, ArrowLeft, ExternalLink, MapPin, ShieldCheck, Sparkles } from "lucide-react";

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
import { crowdCalculationFactors, crowdScoreBands } from "@/lib/crowd-explainer";
import { getNycWeather } from "@/lib/weather";

export function generateStaticParams() {
  return courts.map((court) => ({ slug: court.slug }));
}

export default async function CourtPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const weather = await getNycWeather();
  const court = await getCourtDetail(slug, weather);

  if (!court) notFound();

  const directionsUrl = `https://www.openstreetmap.org/directions?to=${court.latitude}%2C${court.longitude}`;

  return (
    <main className="dink-shell min-h-dvh px-4 py-5 md:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <Link className={buttonVariants({ variant: "ghost" })} href="/">
          <ArrowLeft data-icon="inline-start" />
          Back to map
        </Link>

        <Card className="dink-panel rounded-md border-2 border-background/80">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border border-border bg-secondary/80">
                {court.borough}
              </Badge>
              <Badge variant="secondary" className="border border-border bg-accent/70">
                <Sparkles data-icon="inline-start" />
                {court.crowd.level}
              </Badge>
              {court.accessible ? (
                <Badge variant="secondary" className="border border-border bg-secondary/80">
                  <Accessibility data-icon="inline-start" />
                  Accessible
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-3xl tracking-tight">{court.name}</CardTitle>
            <CardDescription>{court.location}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="dink-stat rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Crowd</div>
                <div className="text-xl font-semibold">{court.crowd.level}</div>
              </div>
              <div className="dink-stat rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Signal</div>
                <div className="text-xl font-semibold">{court.crowd.confidence}</div>
              </div>
              <div className="dink-stat rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Nets</div>
                <div className="text-xl font-semibold">{court.courtCount}</div>
              </div>
              <div className="dink-stat rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Permit</div>
                <div className="text-xl font-semibold">{court.permitRequired ? "Yes" : "No"}</div>
              </div>
            </div>

            <Separator />

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">Why this estimate</h2>
              <p className="text-sm text-muted-foreground">{court.crowd.reasons.join(", ")}</p>
              <p className="text-xs text-muted-foreground">
                Updated {new Date(court.crowd.updatedAt).toLocaleString()}. Recent reports influence the estimate for
                up to two hours.
              </p>
            </section>

            <section className="flex flex-col gap-3 rounded-md border bg-card/70 p-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold">How busyness is calculated</h2>
                <p className="text-sm text-muted-foreground">
                  DinkMap creates a 0-100 score from public court details, current conditions, and verified nearby
                  reports. It is an estimate, not an official occupancy count.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {crowdCalculationFactors.map((factor) => (
                  <div key={factor.title} className="rounded-md border bg-background/70 p-3">
                    <div className="text-sm font-medium">{factor.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{factor.description}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {crowdScoreBands.map((band) => (
                  <Badge key={band.label} variant="outline" className="bg-background/80">
                    {band.label}: {band.range}
                  </Badge>
                ))}
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Reports require browser location and are accepted only within 300 meters of the court. Exact reporter
                coordinates are used for verification and are not stored.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">Latest reports</h2>
              {court.reports.length ? (
                <div className="flex flex-col gap-2">
                  {court.reports.slice(0, 3).map((report) => (
                    <div key={report.id} className="rounded-md border p-3 text-sm">
                      <div className="font-medium">{report.level}</div>
                      <div className="text-muted-foreground">
                        {report.waitingCount !== undefined ? `${report.waitingCount} waiting · ` : ""}
                        {report.openCourts !== undefined ? `${report.openCourts} open courts · ` : ""}
                        {new Date(report.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No fresh verified reports yet.</p>
              )}
            </section>

            <div className="grid gap-2 sm:grid-cols-2">
              <a className={buttonVariants()} href={directionsUrl} target="_blank" rel="noreferrer">
                  <MapPin data-icon="inline-start" />
                  Directions
                  <ExternalLink data-icon="inline-end" />
              </a>
              <Link className={buttonVariants({ variant: "outline" })} href="/">
                  <ShieldCheck data-icon="inline-start" />
                  Report from map
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
