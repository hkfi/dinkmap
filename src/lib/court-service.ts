import { courts, getCourtById, getCourtBySlug } from "@/lib/courts";
import { getRecentReports } from "@/lib/reports-store";
import { calculateCrowdScore, defaultWeather } from "@/lib/scoring";
import type { CourtWithScore, WeatherSnapshot } from "@/lib/types";

export async function getCourtsWithScores(weather: WeatherSnapshot = defaultWeather()) {
  return courts
    .filter((court) => court.active)
    .map<CourtWithScore>((court) => {
      const reports = getRecentReports(court.id);
      return {
        ...court,
        crowd: calculateCrowdScore(court, reports, weather),
        reports,
      };
    });
}

export async function getCourtDetail(slug: string, weather: WeatherSnapshot = defaultWeather()) {
  const court = getCourtBySlug(slug);
  if (!court) return null;
  const reports = getRecentReports(court.id);

  return {
    ...court,
    crowd: calculateCrowdScore(court, reports, weather),
    reports,
  } satisfies CourtWithScore;
}

export { courts, getCourtById, getCourtBySlug };
