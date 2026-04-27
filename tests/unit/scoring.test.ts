import { describe, expect, it } from "vitest";

import { courts } from "@/lib/courts";
import { calculateCrowdScore } from "@/lib/scoring";
import type { CrowdReport, WeatherSnapshot } from "@/lib/types";

const court = courts.find((item) => item.id === "carl-schurz-park")!;

const goodWeather: WeatherSnapshot = {
  temperature: 72,
  precipitation: 0,
  windSpeed: 6,
  daylight: true,
  fetchedAt: "2026-04-26T12:00:00.000Z",
};

describe("calculateCrowdScore", () => {
  it("raises demand during playable after-work windows", () => {
    const score = calculateCrowdScore(court, [], goodWeather, new Date("2026-04-27T22:30:00.000Z"));

    expect(["Busy", "Packed"]).toContain(score.level);
    expect(score.reasons).toContain("after-work peak");
  });

  it("lets fresh reports strongly influence the estimate", () => {
    const reports: CrowdReport[] = [
      {
        id: "report-1",
        courtId: court.id,
        level: "Packed",
        waitingCount: 12,
        distanceBucket: "0-150m",
        createdAt: "2026-04-27T22:20:00.000Z",
      },
    ];

    const score = calculateCrowdScore(court, reports, goodWeather, new Date("2026-04-27T22:30:00.000Z"));

    expect(score.level).toBe("Packed");
    expect(score.confidence).toBe("Fresh");
  });

  it("expires stale reports after two hours", () => {
    const reports: CrowdReport[] = [
      {
        id: "report-1",
        courtId: court.id,
        level: "Packed",
        distanceBucket: "0-150m",
        createdAt: "2026-04-27T18:00:00.000Z",
      },
    ];

    const score = calculateCrowdScore(court, reports, goodWeather, new Date("2026-04-27T22:30:00.000Z"));

    expect(score.confidence).toBe("Model only");
  });

  it("penalizes bad weather", () => {
    const rainy: WeatherSnapshot = {
      ...goodWeather,
      precipitation: 0.25,
      windSpeed: 25,
    };

    const rainyScore = calculateCrowdScore(court, [], rainy, new Date("2026-04-27T22:30:00.000Z"));
    const sunnyScore = calculateCrowdScore(court, [], goodWeather, new Date("2026-04-27T22:30:00.000Z"));

    expect(rainyScore.score).toBeLessThan(sunnyScore.score);
  });
});
