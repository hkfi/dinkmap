import type { Court, CrowdLevel, CrowdReport, CrowdScore, WeatherSnapshot } from "@/lib/types";

const levelValue: Record<CrowdLevel, number> = {
  Low: 18,
  Moderate: 45,
  Busy: 70,
  Packed: 92,
};

export function scoreToLevel(score: number): CrowdLevel {
  if (score >= 78) return "Packed";
  if (score >= 56) return "Busy";
  if (score >= 32) return "Moderate";
  return "Low";
}

function reportWeight(createdAt: string, now: Date) {
  const ageMinutes = Math.max(0, (now.getTime() - new Date(createdAt).getTime()) / 60_000);
  if (ageMinutes > 120) return 0;
  if (ageMinutes <= 20) return 1;
  return Math.max(0, 1 - (ageMinutes - 20) / 100);
}

export function calculateCrowdScore(
  court: Court,
  reports: CrowdReport[] = [],
  weather: WeatherSnapshot,
  now = new Date(),
): CrowdScore {
  const hour = now.getHours();
  const day = now.getDay();
  const weekend = day === 0 || day === 6;
  const afterWork = hour >= 17 && hour <= 21;
  const morning = hour >= 7 && hour <= 10;
  const lunch = hour >= 11 && hour <= 14;
  const playableWeather =
    weather.temperature >= 50 &&
    weather.temperature <= 85 &&
    weather.precipitation < 0.05 &&
    weather.windSpeed < 18;

  let score = 18;
  const reasons: string[] = [];

  if (weekend) {
    score += 20;
    reasons.push("weekend demand");
  }
  if (afterWork) {
    score += 24;
    reasons.push("after-work peak");
  } else if (morning || lunch) {
    score += 10;
    reasons.push(morning ? "morning play window" : "midday play window");
  }
  if (weather.daylight) {
    score += 10;
    reasons.push("daylight");
  }
  if (playableWeather) {
    score += 17;
    reasons.push("good playing weather");
  } else {
    score -= 18;
    reasons.push("weather drag");
  }
  if (court.courtCount <= 2) {
    score += 9;
    reasons.push("limited courts");
  }
  if (court.courtCount >= 6) {
    score -= 7;
    reasons.push("more court capacity");
  }
  if (court.borough === "Manhattan" || court.borough === "Brooklyn") {
    score += 8;
    reasons.push("dense nearby demand");
  }
  if (court.permitRequired) {
    score -= 6;
    reasons.push("permit friction");
  }

  const weightedReports = reports
    .map((report) => ({ report, weight: reportWeight(report.createdAt, now) }))
    .filter(({ weight }) => weight > 0);

  const reportWeightTotal = weightedReports.reduce((sum, item) => sum + item.weight, 0);

  if (reportWeightTotal > 0) {
    const reportAverage =
      weightedReports.reduce((sum, item) => sum + levelValue[item.report.level] * item.weight, 0) /
      reportWeightTotal;
    const influence = Math.min(0.74, 0.42 + reportWeightTotal * 0.12);
    score = score * (1 - influence) + reportAverage * influence;
    reasons.unshift(`${weightedReports.length} fresh verified report${weightedReports.length === 1 ? "" : "s"}`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const latestReportAt = weightedReports
    .map(({ report }) => report.createdAt)
    .sort()
    .at(-1);

  return {
    courtId: court.id,
    level: scoreToLevel(score),
    confidence:
      weightedReports.length >= 3 ? "High" : weightedReports.length > 0 ? "Fresh" : "Model only",
    score,
    updatedAt: now.toISOString(),
    reasons: reasons.slice(0, 4),
    latestReportAt,
  };
}

export function defaultWeather(now = new Date()): WeatherSnapshot {
  const hour = now.getHours();

  return {
    temperature: 66,
    precipitation: 0,
    windSpeed: 7,
    daylight: hour >= 6 && hour < 20,
    fetchedAt: now.toISOString(),
  };
}
