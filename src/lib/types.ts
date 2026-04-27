export type Borough = "Bronx" | "Brooklyn" | "Manhattan" | "Queens" | "Staten Island";

export type CrowdLevel = "Low" | "Moderate" | "Busy" | "Packed";

export type Confidence = "Model only" | "Fresh" | "High";

export type Court = {
  id: string;
  slug: string;
  name: string;
  borough: Borough;
  parkName: string;
  location: string;
  latitude: number;
  longitude: number;
  courtCount: number;
  permitRequired: boolean;
  accessible: boolean;
  active: boolean;
  sourceUrl: string;
  notes?: string;
};

export type CrowdReport = {
  id: string;
  courtId: string;
  level: CrowdLevel;
  waitingCount?: number;
  openCourts?: number;
  note?: string;
  distanceBucket: "0-150m" | "150-300m";
  createdAt: string;
};

export type WeatherSnapshot = {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  daylight: boolean;
  fetchedAt: string;
};

export type CrowdScore = {
  courtId: string;
  level: CrowdLevel;
  confidence: Confidence;
  score: number;
  updatedAt: string;
  reasons: string[];
  latestReportAt?: string;
};

export type CourtWithScore = Court & {
  crowd: CrowdScore;
  reports: CrowdReport[];
};
