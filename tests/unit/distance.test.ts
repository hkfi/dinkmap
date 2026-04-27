import { describe, expect, it } from "vitest";

import { distanceInMeters } from "@/lib/distance";

describe("distanceInMeters", () => {
  const court = { latitude: 40.7751, longitude: -73.9437 };

  it("accepts points at the court", () => {
    expect(distanceInMeters(court, court)).toBeLessThan(1);
  });

  it("keeps nearby sidewalk reports inside the 300m geofence", () => {
    const nearby = { latitude: 40.7768, longitude: -73.9451 };
    expect(distanceInMeters(nearby, court)).toBeLessThan(300);
  });

  it("rejects reports from outside the court area", () => {
    const farAway = { latitude: 40.7831, longitude: -73.9712 };
    expect(distanceInMeters(farAway, court)).toBeGreaterThan(300);
  });
});
