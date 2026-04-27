"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  LngLatBounds,
  type GeoJSONSource,
  type Map,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import {
  Accessibility,
  ArrowDownUp,
  Clock,
  Crosshair,
  ExternalLink,
  Info,
  LocateFixed,
  Navigation,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Sunset,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Umbrella,
  Users,
  Wind,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { BusynessExplainerDialog } from "@/components/courts/busyness-explainer-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { distanceInMeters } from "@/lib/distance";
import type {
  Borough,
  CourtWithScore,
  CrowdLevel,
  WeatherSnapshot,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey = "Busiest" | "Quietest" | "Nearest";

type Filters = {
  borough: Borough | "All";
  crowd: CrowdLevel | "All";
  permit: "All" | "No permit" | "Permit";
  accessible: boolean;
  nearMe: boolean;
};

const crowdColors: Record<CrowdLevel, string> = {
  Low: "#19b86a",
  Moderate: "#f4bf35",
  Busy: "#ff7b39",
  Packed: "#e63f5f",
};

const crowdLevelLabels: CrowdLevel[] = ["Low", "Moderate", "Busy", "Packed"];

const boroughs: Array<Borough | "All"> = [
  "All",
  "Bronx",
  "Brooklyn",
  "Manhattan",
  "Queens",
  "Staten Island",
];

const crowdLevels: Array<CrowdLevel | "All"> = ["All", ...crowdLevelLabels];

const NYC_CENTER: [number, number] = [-73.94, 40.78];

const nycMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
    courts: {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    },
    courtsSelected: {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    },
    userLocation: {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    },
  },
  layers: [
    { id: "osm", type: "raster", source: "osm" },
    {
      id: "court-points-halo",
      type: "circle",
      source: "courts",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 14, 14, 32],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.18,
      },
    },
    {
      id: "court-points",
      type: "circle",
      source: "courts",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 7, 14, 14],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2.5,
      },
    },
    {
      id: "court-selected-halo",
      type: "circle",
      source: "courtsSelected",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 22, 14, 44],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.16,
      },
    },
    {
      id: "court-selected-ring",
      type: "circle",
      source: "courtsSelected",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 13, 14, 22],
        "circle-color": "rgba(0,0,0,0)",
        "circle-stroke-color": "#0f6f48",
        "circle-stroke-width": 3,
      },
    },
    {
      id: "court-selected-dot",
      type: "circle",
      source: "courtsSelected",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 9, 14, 16],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3.5,
      },
    },
    {
      id: "user-location-halo",
      type: "circle",
      source: "userLocation",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 18, 14, 30],
        "circle-color": "#2563eb",
        "circle-opacity": 0.18,
        "circle-stroke-color": "#2563eb",
        "circle-stroke-opacity": 0.28,
        "circle-stroke-width": 2,
      },
    },
    {
      id: "user-location-dot",
      type: "circle",
      source: "userLocation",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 7, 14, 10],
        "circle-color": "#2563eb",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
      },
    },
  ],
};

function courtsToGeoJson(courts: CourtWithScore[]) {
  return {
    type: "FeatureCollection" as const,
    features: courts.map((court) => ({
      type: "Feature" as const,
      properties: {
        id: court.id,
        name: court.name,
        level: court.crowd.level,
        color: crowdColors[court.crowd.level],
      },
      geometry: {
        type: "Point" as const,
        coordinates: [court.longitude, court.latitude],
      },
    })),
  };
}

function selectedCourtToGeoJson(court: CourtWithScore | null) {
  return {
    type: "FeatureCollection" as const,
    features: court
      ? [
          {
            type: "Feature" as const,
            properties: {
              id: court.id,
              level: court.crowd.level,
              color: crowdColors[court.crowd.level],
            },
            geometry: {
              type: "Point" as const,
              coordinates: [court.longitude, court.latitude],
            },
          },
        ]
      : [],
  };
}

function userLocationToGeoJson(
  location: { latitude: number; longitude: number } | null,
) {
  return {
    type: "FeatureCollection" as const,
    features: location
      ? [
          {
            type: "Feature" as const,
            properties: { label: "You are here" },
            geometry: {
              type: "Point" as const,
              coordinates: [location.longitude, location.latitude],
            },
          },
        ]
      : [],
  };
}

function crowdBadgeClass(level: CrowdLevel) {
  return {
    Low: "border-emerald-300 bg-emerald-50 text-emerald-800",
    Moderate: "border-yellow-300 bg-yellow-50 text-yellow-900",
    Busy: "border-orange-300 bg-orange-50 text-orange-900",
    Packed: "border-rose-300 bg-rose-50 text-rose-900",
  }[level];
}

function formatReasons(court: CourtWithScore) {
  return court.crowd.reasons.length
    ? court.crowd.reasons.join(" · ")
    : "model estimate";
}

function crowdVibe(level: CrowdLevel) {
  return {
    Low: { title: "Easy rally", note: "Plenty of room to warm up and rotate." },
    Moderate: {
      title: "Good games",
      note: "Enough action without a long wait.",
    },
    Busy: { title: "Hot court", note: "Expect a queue and quick rotations." },
    Packed: {
      title: "Prime-time jam",
      note: "Bring patience or a backup court.",
    },
  }[level];
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const miles = meters / 1609.344;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function relativeTime(date: string) {
  const diffMin = Math.round((Date.now() - new Date(date).getTime()) / 60_000);
  if (diffMin <= 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(date).toLocaleDateString();
}

function ScoreMeter({ score, level }: { score: number; level: CrowdLevel }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>Busyness · {level}</span>
        <span className="font-mono text-foreground">{clamped}/100</span>
      </div>
      <div className="dink-meter">
        <div
          className="dink-meter-fill"
          style={{ width: `${Math.max(6, clamped)}%` }}
        />
      </div>
    </div>
  );
}

function WeatherChip({ weather }: { weather: WeatherSnapshot }) {
  const Icon = !weather.daylight
    ? Sunset
    : weather.precipitation >= 0.05
      ? Umbrella
      : weather.windSpeed >= 18
        ? Wind
        : Sun;
  return (
    <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex">
      <Icon className="size-3.5" />
      <span className="font-medium text-foreground">
        {Math.round(weather.temperature)}°F
      </span>
      <span className="hidden md:inline">
        ·{" "}
        {weather.precipitation >= 0.05
          ? "rainy"
          : weather.daylight
            ? "daylight"
            : "after dark"}
      </span>
    </div>
  );
}

function CourtSummary({
  court,
  distanceMeters,
  onReport,
  onDismiss,
  onDirections,
}: {
  court: CourtWithScore;
  distanceMeters: number | null;
  onReport: (court: CourtWithScore) => void;
  onDismiss?: () => void;
  onDirections: (court: CourtWithScore) => void;
}) {
  const latest = court.reports[0];
  const vibe = crowdVibe(court.crowd.level);
  const dotColor = crowdColors[court.crowd.level];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className="border border-border bg-secondary/80"
            >
              {court.borough}
            </Badge>
            {court.permitRequired ? (
              <Badge
                variant="outline"
                className="border-yellow-300 bg-yellow-50 text-yellow-900"
              >
                Permit
              </Badge>
            ) : null}
            {court.accessible ? (
              <Badge
                variant="secondary"
                className="border border-border bg-secondary/80"
              >
                <Accessibility data-icon="inline-start" />
                Accessible
              </Badge>
            ) : null}
            {distanceMeters !== null ? (
              <Badge variant="outline" className="bg-background/70">
                <Navigation data-icon="inline-start" />
                {formatDistance(distanceMeters)}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight">
            {court.name}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {court.location}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            aria-hidden
            className="dink-pulse mt-1 size-2.5 rounded-full"
            style={{ background: dotColor, color: dotColor }}
          />
          {onDismiss ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Dismiss court card"
              className="xl:hidden"
              onClick={onDismiss}
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>

      <ScoreMeter score={court.crowd.score} level={court.crowd.level} />

      <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-accent/30 p-3 text-sm">
        <div
          className="mt-0.5 size-2 shrink-0 rounded-full"
          style={{ background: dotColor }}
        />
        <div className="min-w-0">
          <div className="font-semibold leading-tight">{vibe.title}</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {vibe.note}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="dink-stat rounded-lg border p-2.5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Nets
          </div>
          <div className="mt-0.5 text-base font-bold">{court.courtCount}</div>
        </div>
        <div className="dink-stat rounded-lg border p-2.5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Permit
          </div>
          <div className="mt-0.5 text-base font-bold">
            {court.permitRequired ? "Yes" : "No"}
          </div>
        </div>
        <div className="dink-stat rounded-lg border p-2.5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Signal
          </div>
          <div className="mt-0.5 text-base font-bold">
            {court.crowd.confidence}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card/75 p-3 text-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="size-3.5" />
          Read on the court
        </div>
        <p className="mt-1.5 text-sm leading-relaxed">{formatReasons(court)}</p>
        {latest ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            <span>
              Latest verified report:{" "}
              <strong className="text-foreground">{latest.level}</strong>
              {latest.waitingCount !== undefined
                ? `, ${latest.waitingCount} waiting`
                : ""}{" "}
              · {relativeTime(latest.createdAt)}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            No fresh court-side reports yet — be the first.
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => onReport(court)} className="col-span-2">
          <Send data-icon="inline-start" />
          Report crowd
        </Button>
        <Button variant="outline" onClick={() => onDirections(court)}>
          <Navigation data-icon="inline-start" />
          Go
        </Button>
      </div>
      <Link
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "justify-center text-xs text-muted-foreground",
        )}
        href={`/courts/${court.slug}`}
      >
        How is this score calculated?
        <ExternalLink data-icon="inline-end" />
      </Link>
    </div>
  );
}

function ReportPanel({
  court,
  onClose,
  onSubmitted,
}: {
  court: CourtWithScore | null;
  onClose: () => void;
  onSubmitted: (court: CourtWithScore) => void;
}) {
  const [level, setLevel] = useState<CrowdLevel>("Moderate");
  const [waitingCount, setWaitingCount] = useState("");
  const [openCourts, setOpenCourts] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitReport() {
    if (!court) return;
    if (!navigator.geolocation) {
      toast.error("Location is required to verify a report.");
      return;
    }

    setSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(`/api/courts/${court.id}/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              level,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              waitingCount: waitingCount ? Number(waitingCount) : undefined,
              openCourts: openCourts ? Number(openCourts) : undefined,
            }),
          });

          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error ?? "Report failed");
          }

          const updatedCourt = {
            ...court,
            crowd: payload.crowd,
            reports: [payload.report, ...court.reports],
          };
          onSubmitted(updatedCourt);
          toast.success("Verified report added. Thanks for the court intel.");
          onClose();
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Report failed",
          );
        } finally {
          setSubmitting(false);
        }
      },
      () => {
        setSubmitting(false);
        toast.error(
          "Location permission is needed to verify that you are near the court.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  if (!court) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dink-panel w-full max-w-xl rounded-t-2xl border bg-popover p-4 shadow-xl sm:rounded-2xl">
        <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="report-title" className="text-lg font-bold">
              Report crowd level
            </h2>
            <p className="text-sm text-muted-foreground">
              Reports are accepted only within 300m. Exact location is used for
              verification and not stored.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close report"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-5">
          <div className="rounded-lg border border-border/60 bg-accent/25 p-3">
            <div className="text-sm font-semibold">{court.name}</div>
            <div className="text-xs text-muted-foreground">
              {court.borough} · What does it look like right now?
            </div>
          </div>
          <ToggleGroup
            value={[level]}
            onValueChange={(value) => {
              if (value[0]) setLevel(value[0] as CrowdLevel);
            }}
            className="grid grid-cols-4 gap-2"
          >
            {crowdLevelLabels.map((item) => (
              <ToggleGroupItem
                key={item}
                value={item}
                aria-label={item}
                className="h-12 flex-col gap-1 text-xs font-semibold"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: crowdColors[item] }}
                  aria-hidden
                />
                {item}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldGroup className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="waiting-count">Waiting</FieldLabel>
              <Input
                id="waiting-count"
                inputMode="numeric"
                min={0}
                placeholder="Optional"
                type="number"
                value={waitingCount}
                onChange={(event) => setWaitingCount(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="open-courts">Open courts</FieldLabel>
              <Input
                id="open-courts"
                inputMode="numeric"
                min={0}
                placeholder="Optional"
                type="number"
                value={openCourts}
                onChange={(event) => setOpenCourts(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button
            onClick={submitReport}
            disabled={submitting}
            size="lg"
            className="h-11"
          >
            {submitting ? (
              <RefreshCw data-icon="inline-start" className="animate-spin" />
            ) : (
              <ShieldCheck data-icon="inline-start" />
            )}
            {submitting ? "Verifying location…" : "Verify and submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CourtFinder({
  initialCourts,
  weather,
}: {
  initialCourts: CourtWithScore[];
  weather: WeatherSnapshot;
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [courts, setCourts] = useState(initialCourts);
  const courtsRef = useRef(initialCourts);
  const [selected, setSelected] = useState<CourtWithScore | null>(
    initialCourts[0] ?? null,
  );
  const [reporting, setReporting] = useState<CourtWithScore | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    borough: "All",
    crowd: "All",
    permit: "All",
    accessible: false,
    nearMe: false,
  });
  const [sortKey, setSortKey] = useState<SortKey>("Busiest");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredCourts = useMemo(() => {
    const result = courts.filter((court) => {
      if (filters.borough !== "All" && court.borough !== filters.borough)
        return false;
      if (filters.crowd !== "All" && court.crowd.level !== filters.crowd)
        return false;
      if (filters.permit === "No permit" && court.permitRequired) return false;
      if (filters.permit === "Permit" && !court.permitRequired) return false;
      if (filters.accessible && !court.accessible) return false;
      return true;
    });

    return result.slice().sort((a, b) => {
      if (sortKey === "Nearest" && userLocation) {
        const da = distanceInMeters(userLocation, a);
        const db = distanceInMeters(userLocation, b);
        return da - db;
      }
      if (sortKey === "Quietest") return a.crowd.score - b.crowd.score;
      return b.crowd.score - a.crowd.score;
    });
  }, [courts, filters, sortKey, userLocation]);

  useEffect(() => {
    courtsRef.current = courts;
  }, [courts]);

  function selectCourt(court: CourtWithScore, zoom = 13) {
    setSelected(court);
    mapRef.current?.flyTo({
      center: [court.longitude, court.latitude],
      zoom: Math.max(mapRef.current.getZoom(), zoom),
      essential: true,
      duration: 650,
    });
  }

  function openDirections(court: CourtWithScore) {
    const origin = userLocation
      ? `&from=${userLocation.latitude}%2C${userLocation.longitude}`
      : "";
    const url = `https://www.openstreetmap.org/directions?to=${court.latitude}%2C${court.longitude}${origin}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      center: NYC_CENTER,
      zoom: 9.4,
      minZoom: 8,
      maxZoom: 16,
      style: nycMapStyle,
      attributionControl: { compact: true },
    });

    map.scrollZoom.enable();
    map.dragPan.enable();
    map.touchZoomRotate.enable({ around: "center" });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    map.on("load", () => {
      setMapReady(true);
      map.resize();
    });
    map.on("click", "court-points", (event: MapLayerMouseEvent) => {
      const courtId = event.features?.[0]?.properties?.id;
      const court = courtsRef.current.find((item) => item.id === courtId);
      if (court) selectCourt(court);
    });
    map.on("mouseenter", "court-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "court-points", () => {
      map.getCanvas().style.cursor = "";
    });
    if (process.env.NODE_ENV !== "production") {
      (window as typeof window & { __pickleballMap?: Map }).__pickleballMap =
        map;
    }
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      if (process.env.NODE_ENV !== "production") {
        delete (window as typeof window & { __pickleballMap?: Map })
          .__pickleballMap;
      }
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource("courts") as GeoJSONSource | undefined;
    source?.setData(courtsToGeoJson(filteredCourts));

    if (
      filters.borough !== "All" ||
      filters.crowd !== "All" ||
      filters.accessible ||
      filters.permit !== "All"
    ) {
      const bounds = new LngLatBounds();
      filteredCourts.forEach((court) =>
        bounds.extend([court.longitude, court.latitude]),
      );
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 650 });
      }
    }
  }, [filteredCourts, filters, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource("courtsSelected") as GeoJSONSource | undefined;
    source?.setData(selectedCourtToGeoJson(selected));
  }, [selected, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource("userLocation") as GeoJSONSource | undefined;
    source?.setData(userLocationToGeoJson(userLocation));
  }, [mapReady, userLocation]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/courts");
        if (response.ok) {
          const payload = await response.json();
          setCourts(payload.courts);
        }
      } catch {
        // Keep the last known court scores if polling fails.
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  function locateUser() {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(location);
        setFilters((current) => ({ ...current, nearMe: true }));
        setSortKey("Nearest");
        mapRef.current?.flyTo({
          center: [location.longitude, location.latitude],
          zoom: 12,
          essential: true,
        });
        toast.success("Got your location — courts now sort by distance.");
      },
      () => toast.error("Location permission was not granted."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function resetFilters() {
    setFilters({
      borough: "All",
      crowd: "All",
      permit: "All",
      accessible: false,
      nearMe: false,
    });
  }

  function updateCourt(updatedCourt: CourtWithScore) {
    setCourts((current) =>
      current.map((court) =>
        court.id === updatedCourt.id ? updatedCourt : court,
      ),
    );
    setSelected(updatedCourt);
  }

  const totalCourts = courts.length;
  const activeFilterCount =
    (filters.borough !== "All" ? 1 : 0) +
    (filters.crowd !== "All" ? 1 : 0) +
    (filters.permit !== "All" ? 1 : 0) +
    (filters.accessible ? 1 : 0);

  const distanceForSelected =
    userLocation && selected ? distanceInMeters(userLocation, selected) : null;

  const list = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="text-xs text-muted-foreground">Sort by</div>
        <ToggleGroup
          value={[sortKey]}
          onValueChange={(value) => {
            if (value[0]) setSortKey(value[0] as SortKey);
          }}
          className="gap-1"
        >
          <ToggleGroupItem
            value="Busiest"
            aria-label="Busiest first"
            className="h-7 px-2 text-xs"
          >
            <TrendingUp className="size-3.5" /> Busy
          </ToggleGroupItem>
          <ToggleGroupItem
            value="Quietest"
            aria-label="Quietest first"
            className="h-7 px-2 text-xs"
          >
            <TrendingDown className="size-3.5" /> Quiet
          </ToggleGroupItem>
          <ToggleGroupItem
            value="Nearest"
            aria-label="Nearest first"
            disabled={!userLocation}
            className="h-7 px-2 text-xs"
          >
            <Navigation className="size-3.5" /> Near
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {filteredCourts.length === 0 ? (
          <div className="m-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 p-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-accent/40 text-accent-foreground">
              <Info className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">No courts match</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Try clearing filters or expanding your borough.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        ) : (
          filteredCourts.map((court) => {
            const distance = userLocation
              ? distanceInMeters(userLocation, court)
              : null;
            const isSelected = selected?.id === court.id;
            return (
              <button
                key={court.id}
                type="button"
                onClick={() => selectCourt(court, 12)}
                className="block w-full rounded-lg text-left outline-none ring-ring transition focus-visible:ring-2"
              >
                <Card
                  size="sm"
                  className={cn(
                    "dink-list-card gap-2 rounded-lg py-3",
                    isSelected
                      ? "border-primary bg-secondary/55 shadow-sm"
                      : "bg-card/95",
                  )}
                >
                  <CardHeader className="gap-2 px-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-sm font-semibold">
                          {court.name}
                        </CardTitle>
                        <CardDescription className="mt-0.5 truncate text-xs">
                          {court.borough}
                          {distance !== null
                            ? ` · ${formatDistance(distance)}`
                            : ` · ${court.courtCount} ${court.courtCount === 1 ? "net" : "nets"}`}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          aria-hidden
                          className="size-2 rounded-full"
                          style={{
                            background: crowdColors[court.crowd.level],
                          }}
                        />
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-bold uppercase tracking-wide",
                            crowdBadgeClass(court.crowd.level),
                          )}
                        >
                          {court.crowd.level}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3">
                    <div className="dink-meter">
                      <div
                        className="dink-meter-fill"
                        style={{
                          width: `${Math.max(6, court.crowd.score)}%`,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-dvh overflow-hidden text-foreground">
      <header className="dink-header absolute left-0 right-0 top-0 z-20 border-b">
        <div className="flex h-16 items-center justify-between gap-3 px-3 md:px-5">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="dink-logo flex size-9 shrink-0 items-center justify-center rounded-full" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight">
                  DinkMap
                </h1>
              </div>
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                NYC public courts · Crowd reads from weather, time and players
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <WeatherChip weather={weather} />
            <Button
              variant={userLocation ? "default" : "outline"}
              size="icon"
              onClick={locateUser}
              aria-label={userLocation ? "Re-center on me" : "Locate me"}
              title={userLocation ? "Re-center on me" : "Locate me"}
            >
              <LocateFixed />
            </Button>
            <BusynessExplainerDialog compact />
            <Button
              variant="outline"
              size="icon"
              aria-label="Open filters"
              onClick={() => setFiltersOpen(true)}
              className="relative"
            >
              <SlidersHorizontal />
              {activeFilterCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            {filtersOpen ? (
              <div
                className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="filters-title"
                onClick={(event) => {
                  if (event.target === event.currentTarget)
                    setFiltersOpen(false);
                }}
              >
                <div className="dink-panel h-dvh w-full max-w-sm border-l bg-popover p-4 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 id="filters-title" className="text-lg font-bold">
                        Court hunt
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Pick the borough, crowd, and access vibe.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close filters"
                      onClick={() => setFiltersOpen(false)}
                    >
                      <X />
                    </Button>
                  </div>
                  <div className="mt-5 flex flex-col gap-5">
                    <Field>
                      <FieldLabel>Borough</FieldLabel>
                      <Select
                        value={filters.borough}
                        onValueChange={(value) =>
                          setFilters((current) => ({
                            ...current,
                            borough: value as Filters["borough"],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {boroughs.map((borough) => (
                              <SelectItem key={borough} value={borough}>
                                {borough}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>Crowd</FieldLabel>
                      <Select
                        value={filters.crowd}
                        onValueChange={(value) =>
                          setFilters((current) => ({
                            ...current,
                            crowd: value as Filters["crowd"],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {crowdLevels.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>Permit</FieldLabel>
                      <ToggleGroup
                        value={[filters.permit]}
                        onValueChange={(value) => {
                          if (value[0]) {
                            setFilters((current) => ({
                              ...current,
                              permit: value[0] as Filters["permit"],
                            }));
                          }
                        }}
                        className="grid grid-cols-3 gap-2"
                      >
                        {(
                          ["All", "No permit", "Permit"] as Filters["permit"][]
                        ).map((value) => (
                          <ToggleGroupItem
                            key={value}
                            value={value}
                            aria-label={value}
                          >
                            {value}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </Field>
                    <Button
                      variant={filters.accessible ? "default" : "outline"}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          accessible: !current.accessible,
                        }))
                      }
                    >
                      <Accessibility data-icon="inline-start" />
                      Accessible courts only
                    </Button>
                    <Button
                      variant={filters.nearMe ? "default" : "outline"}
                      onClick={locateUser}
                    >
                      <Crosshair data-icon="inline-start" />
                      {userLocation ? "Centered near me" : "Near me"}
                    </Button>
                    {activeFilterCount > 0 ? (
                      <Button variant="ghost" onClick={resetFilters}>
                        Clear all filters
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div
        ref={mapContainer}
        className="map-shell absolute inset-x-0 bottom-0 top-16 z-0"
      />

      {/* Sidebar (xl+) */}
      <aside className="dink-panel absolute bottom-0 left-0 top-16 z-10 hidden w-[400px] border-r xl:flex xl:flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-bold">
              {filteredCourts.length}{" "}
              <span className="font-medium text-muted-foreground">
                of {totalCourts} courts
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Updated{" "}
              {now.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
          <Badge variant="outline" className="bg-background/70">
            <Thermometer data-icon="inline-start" />
            {Math.round(weather.temperature)}°F
          </Badge>
        </div>
        <div className="min-h-0 flex-1">{list}</div>
      </aside>

      {/* Floating legend */}
      <div className="pointer-events-none absolute left-3 right-3 top-20 z-10 flex flex-wrap gap-1.5 xl:left-[416px] xl:right-[420px]">
        {userLocation ? (
          <Badge
            variant="secondary"
            className="pointer-events-auto gap-1.5 border border-background/80 bg-background/95 shadow-sm"
          >
            <span className="size-2 rounded-full bg-blue-600" />
            You
          </Badge>
        ) : null}
        {crowdLevelLabels.map((level) => (
          <Badge
            key={level}
            variant="secondary"
            className="pointer-events-auto gap-1.5 border border-background/80 bg-background/95 shadow-sm"
          >
            <span
              className="size-2 rounded-full"
              style={{ background: crowdColors[level] }}
            />
            {level}
          </Badge>
        ))}
      </div>

      {/* Selected court card (mobile bottom / xl right) */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center px-3 pb-3 xl:bottom-4 xl:left-auto xl:right-5 xl:w-[400px] xl:px-0 xl:pb-0">
        {selected ? (
          <Card className="dink-floating-card dink-panel w-full">
            <CardContent className="p-4">
              <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-border xl:hidden" />
              <CourtSummary
                court={selected}
                distanceMeters={distanceForSelected}
                onReport={setReporting}
                onDismiss={() => setSelected(null)}
                onDirections={openDirections}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="hidden xl:block">
            <Card className="dink-floating-card dink-panel w-full">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-accent/40">
                  <Info className="size-5" />
                </div>
                <div className="text-sm font-semibold">Pick a court</div>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Tap a dot on the map or a court in the list to see live-ish
                  crowd reads.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Mobile list trigger */}
      <MobileList
        list={list}
        count={filteredCourts.length}
        total={totalCourts}
      />

      <ReportPanel
        court={reporting}
        onClose={() => setReporting(null)}
        onSubmitted={updateCourt}
      />
    </div>
  );
}

function MobileList({
  list,
  count,
  total,
}: {
  list: React.ReactNode;
  count: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-4 left-3 z-10 flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur"
      >
        <ArrowDownUp className="size-3.5" />
        {count} of {total} courts
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/35 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="dink-panel flex h-[78vh] w-full flex-col rounded-t-2xl border-t bg-popover">
            <div className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between px-4 py-2">
              <div>
                <div className="text-sm font-bold">
                  {count}{" "}
                  <span className="font-medium text-muted-foreground">
                    of {total} courts
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close list"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <div
              className="min-h-0 flex-1"
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button")) setOpen(false);
              }}
            >
              {list}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
