import { CourtFinder } from "@/components/courts/court-finder";
import { getCourtsWithScores } from "@/lib/court-service";
import { getNycWeather } from "@/lib/weather";

export default async function Home() {
  const weather = await getNycWeather();
  const courts = await getCourtsWithScores(weather);

  return <CourtFinder initialCourts={courts} weather={weather} />;
}
