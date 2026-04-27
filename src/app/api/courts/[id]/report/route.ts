import { headers } from "next/headers";
import { z } from "zod";

import { getCourtById } from "@/lib/court-service";
import { distanceBucket, distanceInMeters } from "@/lib/distance";
import {
  canSubmitReport,
  getRecentReports,
  recordSubmission,
  reportStore,
} from "@/lib/reports-store";
import { calculateCrowdScore, defaultWeather } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CrowdReport } from "@/lib/types";

const reportSchema = z.object({
  level: z.enum(["Low", "Moderate", "Busy", "Packed"]),
  waitingCount: z.number().int().min(0).max(200).optional(),
  openCourts: z.number().int().min(0).max(100).optional(),
  note: z.string().trim().max(180).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

async function requestKey(courtId: string) {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || headerList.get("x-real-ip") || "local";
  return `${ip}:${courtId}`;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const court = getCourtById(id);

  if (!court) {
    return Response.json({ error: "Court not found" }, { status: 404 });
  }

  const parsed = reportSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid report", issues: parsed.error.flatten() }, { status: 400 });
  }

  const distance = distanceInMeters(
    { latitude: parsed.data.latitude, longitude: parsed.data.longitude },
    { latitude: court.latitude, longitude: court.longitude },
  );

  if (distance > 300) {
    return Response.json(
      {
        error: "Reports must be submitted within 300 meters of the court.",
        distance: Math.round(distance),
      },
      { status: 403 },
    );
  }

  const key = await requestKey(court.id);
  if (!canSubmitReport(key)) {
    return Response.json({ error: "Too many reports. Try again in a few minutes." }, { status: 429 });
  }

  const report: CrowdReport = {
    id: crypto.randomUUID(),
    courtId: court.id,
    level: parsed.data.level,
    waitingCount: parsed.data.waitingCount,
    openCourts: parsed.data.openCourts,
    note: parsed.data.note,
    distanceBucket: distanceBucket(distance),
    createdAt: new Date().toISOString(),
  };

  reportStore.reports.unshift(report);
  recordSubmission(key);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from("crowd_reports").insert({
      id: report.id,
      court_id: report.courtId,
      level: report.level,
      waiting_count: report.waitingCount,
      open_courts: report.openCourts,
      note: report.note,
      distance_bucket: report.distanceBucket,
      created_at: report.createdAt,
    });
    await supabase.from("analytics_events").insert({
      event_name: "report.accepted",
      court_id: court.id,
      metadata: { distance_bucket: report.distanceBucket },
    });
  }

  const reports = getRecentReports(court.id);
  const crowd = calculateCrowdScore(court, reports, defaultWeather());

  return Response.json({ report, crowd });
}
