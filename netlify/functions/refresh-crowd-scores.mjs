export default async function refreshCrowdScores() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    console.log("Skipping crowd score refresh: no site URL is available.");
    return new Response("Missing site URL", { status: 202 });
  }

  const headers = new Headers();
  if (process.env.CRON_SECRET) {
    headers.set("authorization", `Bearer ${process.env.CRON_SECRET}`);
  }

  const refreshUrl = new URL("/api/cron/refresh-crowd-scores", siteUrl);
  const response = await fetch(refreshUrl, { headers });
  const body = await response.text();

  if (!response.ok) {
    console.error("Crowd score refresh failed", {
      status: response.status,
      body,
    });
    return new Response(body || "Crowd score refresh failed", { status: response.status });
  }

  console.log("Crowd score refresh completed", body);
  return new Response(body, {
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
    },
  });
}
