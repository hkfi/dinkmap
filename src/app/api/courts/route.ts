import { getCourtsWithScores } from "@/lib/court-service";
import { getNycWeather } from "@/lib/weather";

export async function GET() {
  const weather = await getNycWeather();
  const courts = await getCourtsWithScores(weather);

  return Response.json({ courts, weather });
}
