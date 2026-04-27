import { defaultWeather } from "@/lib/scoring";
import type { WeatherSnapshot } from "@/lib/types";

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
    is_day?: number;
  };
};

export async function getNycWeather(): Promise<WeatherSnapshot> {
  const fallback = defaultWeather();

  try {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m,precipitation,wind_speed_10m,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch",
      { next: { revalidate: 900 } },
    );

    if (!response.ok) return fallback;

    const data = (await response.json()) as OpenMeteoResponse;
    return {
      temperature: data.current?.temperature_2m ?? fallback.temperature,
      precipitation: data.current?.precipitation ?? fallback.precipitation,
      windSpeed: data.current?.wind_speed_10m ?? fallback.windSpeed,
      daylight: data.current?.is_day === 1,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return fallback;
  }
}
