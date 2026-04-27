export const crowdScoreBands = [
  { label: "Low", range: "0-31" },
  { label: "Moderate", range: "32-55" },
  { label: "Busy", range: "56-77" },
  { label: "Packed", range: "78-100" },
] as const;

export const crowdCalculationFactors = [
  {
    title: "Time and daylight",
    description: "Weekend demand, after-work peaks, morning/lunch play windows, and daylight adjust the baseline.",
  },
  {
    title: "Weather",
    description: "Open-Meteo temperature, precipitation, and wind determine whether conditions are playable.",
  },
  {
    title: "Court context",
    description: "Court count, borough density, and permit requirements adjust expected demand and capacity.",
  },
  {
    title: "Fresh reports",
    description: "Verified nearby player reports become a recency-weighted average that fades out over two hours.",
  },
] as const;

export const baselineFormulaTerms = [
  { label: "Start", value: "18" },
  { label: "Weekend", value: "+20" },
  { label: "After-work", value: "+24" },
  { label: "Morning or lunch", value: "+10" },
  { label: "Daylight", value: "+10" },
  { label: "Good weather", value: "+17" },
  { label: "Weather drag", value: "-18" },
  { label: "Limited courts", value: "+9" },
  { label: "Six or more courts", value: "-7" },
  { label: "Manhattan/Brooklyn density", value: "+8" },
  { label: "Permit required", value: "-6" },
] as const;

export const reportLevelValues = [
  { label: "Low", value: "18" },
  { label: "Moderate", value: "45" },
  { label: "Busy", value: "70" },
  { label: "Packed", value: "92" },
] as const;

export const busynessFormulaSteps = [
  {
    title: "1. Build the model score",
    formula: "model = 18 + time/daylight/weather/capacity/location/permit adjustments",
    detail: "This is a deterministic rules model, not phone-location tracking and not a black-box AI model.",
  },
  {
    title: "2. Convert fresh reports to numbers",
    formula: "reportAverage = sum(reportValue * recencyWeight) / sum(recencyWeight)",
    detail: "Reports map to Low 18, Moderate 45, Busy 70, and Packed 92 before averaging.",
  },
  {
    title: "3. Decay report influence",
    formula: "recencyWeight = 1 for 0-20 min; then 1 - ((ageMinutes - 20) / 100); 0 after 120 min",
    detail: "A report counts fully at first, then linearly fades until it drops out after two hours.",
  },
  {
    title: "4. Blend reports with the model",
    formula: "influence = min(0.74, 0.42 + 0.12 * sum(recencyWeight))",
    detail: "Fresh reports can dominate the estimate, but the baseline still anchors noisy or sparse data.",
  },
  {
    title: "5. Clamp and label the score",
    formula: "score = round(clamp(model * (1 - influence) + reportAverage * influence, 0, 100))",
    detail: "The final 0-100 score is converted into Low, Moderate, Busy, or Packed.",
  },
] as const;
