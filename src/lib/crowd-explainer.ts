export const crowdScoreBands = [
  { label: "Low", range: "0-31" },
  { label: "Moderate", range: "32-55" },
  { label: "Busy", range: "56-77" },
  { label: "Packed", range: "78-100" },
] as const;

export const crowdCalculationFactors = [
  {
    title: "Time and daylight",
    description: "Weekends, after-work hours, morning/lunch windows, and daylight raise the baseline.",
  },
  {
    title: "Weather",
    description: "Open-Meteo temperature, precipitation, and wind decide whether conditions are good for play.",
  },
  {
    title: "Court context",
    description: "Court count, borough density, and permit requirements adjust expected demand and capacity.",
  },
  {
    title: "Fresh reports",
    description: "Verified nearby player reports strongly influence the score, then fade out over two hours.",
  },
] as const;

