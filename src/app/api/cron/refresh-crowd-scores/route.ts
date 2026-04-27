import { getCourtsWithScores } from "@/lib/court-service";
import { getNycWeather } from "@/lib/weather";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weather = await getNycWeather();
  const courts = await getCourtsWithScores(weather);

  return Response.json({
    refreshedAt: new Date().toISOString(),
    count: courts.length,
    courts: courts.map((court) => court.crowd),
  });
}
