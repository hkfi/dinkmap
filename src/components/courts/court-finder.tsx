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
  Clock,
  Crosshair,
  ExternalLink,
  LocateFixed,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

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
import type { Borough, CourtWithScore, CrowdLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

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

const boroughs: Array<Borough | "All"> = [
  "All",
  "Bronx",
  "Brooklyn",
  "Manhattan",
  "Queens",
  "Staten Island",
];

const crowdLevels: Array<CrowdLevel | "All"> = ["All", "Low", "Moderate", "Busy", "Packed"];

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
      data: {
        type: "FeatureCollection",
        features: [],
      },
    },
  },
  layers: [
    { id: "osm", type: "raster", source: "osm" },
    {
      id: "court-points-halo",
      type: "circle",
      source: "courts",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 15, 14, 30],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.2,
      },
    },
    {
      id: "court-points",
      type: "circle",
      source: "courts",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 9, 14, 19],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#163c37",
        "circle-stroke-width": 2.5,
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

function crowdBadgeClass(level: CrowdLevel) {
  return {
    Low: "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm",
    Moderate: "border-yellow-300 bg-yellow-50 text-yellow-900 shadow-sm",
    Busy: "border-orange-300 bg-orange-50 text-orange-900 shadow-sm",
    Packed: "border-rose-300 bg-rose-50 text-rose-900 shadow-sm",
  }[level];
}

function formatReasons(court: CourtWithScore) {
  return court.crowd.reasons.length ? court.crowd.reasons.join(", ") : "model estimate";
}

function crowdVibe(level: CrowdLevel) {
  return {
    Low: { title: "Easy rally", note: "Plenty of room to warm up and rotate." },
    Moderate: { title: "Good games", note: "Enough action without a long wait." },
    Busy: { title: "Hot court", note: "Expect a queue and quick rotations." },
    Packed: { title: "Prime-time jam", note: "Bring patience or a backup court." },
  }[level];
}

function CourtSummary({
  court,
  onReport,
}: {
  court: CourtWithScore;
  onReport: (court: CourtWithScore) => void;
}) {
  const latest = court.reports[0];
  const vibe = crowdVibe(court.crowd.level);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="border border-border bg-secondary/80">
              {court.borough}
            </Badge>
            {court.accessible ? (
              <Badge variant="secondary" className="border border-border bg-secondary/80">
                <Accessibility data-icon="inline-start" />
                Accessible
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{court.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{court.location}</p>
        </div>
        <Badge variant="outline" className={crowdBadgeClass(court.crowd.level)}>
          {court.crowd.level}
        </Badge>
      </div>

      <div className="rounded-md border bg-accent/35 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles data-icon="inline-start" />
          {vibe.title}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{vibe.note}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="dink-stat rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Nets</div>
          <div className="text-lg font-semibold">{court.courtCount}</div>
        </div>
        <div className="dink-stat rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Permit</div>
          <div className="text-lg font-semibold">{court.permitRequired ? "Yes" : "No"}</div>
        </div>
        <div className="dink-stat rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Signal</div>
          <div className="text-lg font-semibold">{court.crowd.confidence}</div>
        </div>
      </div>

      <div className="rounded-md border bg-card/75 p-3 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Clock data-icon="inline-start" />
          Read on the court
        </div>
        <p className="mt-1 text-muted-foreground">{formatReasons(court)}</p>
        {latest ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Latest verified report: {latest.level}
            {latest.waitingCount !== undefined ? `, ${latest.waitingCount} waiting` : ""}.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => onReport(court)}>
          <Send data-icon="inline-start" />
          Report crowd
        </Button>
        <Link className={buttonVariants({ variant: "outline" })} href={`/courts/${court.slug}`}>
          Details
          <ExternalLink data-icon="inline-end" />
        </Link>
      </div>
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
          toast.error(error instanceof Error ? error.message : "Report failed");
        } finally {
          setSubmitting(false);
        }
      },
      () => {
        setSubmitting(false);
        toast.error("Location permission is needed to verify that you are near the court.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  if (!court) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="dink-panel w-full max-w-xl rounded-t-lg border bg-popover p-4 shadow-xl sm:rounded-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="report-title" className="text-lg font-semibold">Report crowd level</h2>
            <p className="text-sm text-muted-foreground">
            Reports are accepted only within 300 meters. Exact location is used for verification and not stored.
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close report" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="mt-5 flex flex-col gap-5">
          <div>
            <div className="text-sm font-medium">{court?.name}</div>
            <div className="text-sm text-muted-foreground">What does it look like right now?</div>
          </div>
          <ToggleGroup
            value={[level]}
            onValueChange={(value) => {
              if (value[0]) setLevel(value[0] as CrowdLevel);
            }}
            className="grid grid-cols-4 gap-2"
          >
            {(["Low", "Moderate", "Busy", "Packed"] as CrowdLevel[]).map((item) => (
              <ToggleGroupItem key={item} value={item} aria-label={item} className="h-11">
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
          <Button onClick={submitReport} disabled={submitting}>
            {submitting ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <ShieldCheck data-icon="inline-start" />}
            Verify and submit
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CourtFinder({ initialCourts }: { initialCourts: CourtWithScore[] }) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [courts, setCourts] = useState(initialCourts);
  const courtsRef = useRef(initialCourts);
  const [selected, setSelected] = useState<CourtWithScore | null>(initialCourts[0] ?? null);
  const [reporting, setReporting] = useState<CourtWithScore | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    borough: "All",
    crowd: "All",
    permit: "All",
    accessible: false,
    nearMe: false,
  });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const filteredCourts = useMemo(() => {
    return courts.filter((court) => {
      if (filters.borough !== "All" && court.borough !== filters.borough) return false;
      if (filters.crowd !== "All" && court.crowd.level !== filters.crowd) return false;
      if (filters.permit === "No permit" && court.permitRequired) return false;
      if (filters.permit === "Permit" && !court.permitRequired) return false;
      if (filters.accessible && !court.accessible) return false;
      return true;
    });
  }, [courts, filters]);

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

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      center: [-73.94, 40.8],
      zoom: 9.45,
      minZoom: 8,
      maxZoom: 16,
      style: nycMapStyle,
    });

    map.scrollZoom.enable();
    map.dragPan.enable();
    map.touchZoomRotate.enable({ around: "center" });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
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
      (window as typeof window & { __pickleballMap?: Map }).__pickleballMap = map;
    }
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      if (process.env.NODE_ENV !== "production") {
        delete (window as typeof window & { __pickleballMap?: Map }).__pickleballMap;
      }
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource("courts") as GeoJSONSource | undefined;
    source?.setData(courtsToGeoJson(filteredCourts));

    if (filters.borough !== "All" || filters.crowd !== "All" || filters.accessible || filters.permit !== "All") {
      const bounds = new LngLatBounds();
      filteredCourts.forEach((court) => bounds.extend([court.longitude, court.latitude]));
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 56, maxZoom: 12, duration: 650 });
      }
    }
  }, [filteredCourts, filters, mapReady]);

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
        mapRef.current?.flyTo({ center: [location.longitude, location.latitude], zoom: 12, essential: true });
        toast.success("Centered near you. Reports still require court-side verification.");
      },
      () => toast.error("Location permission was not granted."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function updateCourt(updatedCourt: CourtWithScore) {
    setCourts((current) => current.map((court) => (court.id === updatedCourt.id ? updatedCourt : court)));
    setSelected(updatedCourt);
  }

  const list = (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      {filteredCourts.map((court) => (
        <button
          key={court.id}
          type="button"
          onClick={() => selectCourt(court, 12)}
          className="block w-full rounded-md text-left outline-none ring-ring transition focus-visible:ring-2"
        >
          <Card
            size="sm"
            className={cn(
              "dink-list-card gap-2 rounded-md py-3 transition",
              selected?.id === court.id ? "border-primary bg-secondary/55" : "bg-card/90",
            )}
          >
            <CardHeader className="gap-2 px-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{court.name}</CardTitle>
                  <CardDescription className="truncate">{court.borough} · {court.courtCount} courts</CardDescription>
                </div>
                <Badge variant="outline" className={crowdBadgeClass(court.crowd.level)}>
                  {court.crowd.level}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 text-xs leading-snug text-muted-foreground">
              {court.crowd.confidence} · {formatReasons(court)}
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );

  return (
    <div className="dink-shell relative min-h-dvh overflow-hidden text-foreground">
      <header className="dink-header absolute left-0 right-0 top-0 z-20 border-b backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-3 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="dink-logo flex size-10 shrink-0 items-center justify-center rounded-md text-primary-foreground">
              <MapPin />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight">DinkMap</h1>
                <Badge variant="secondary" className="hidden border border-border bg-accent/70 sm:inline-flex">
                  Court vibe check
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Find the liveliest public courts without the guesswork
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={locateUser} aria-label="Locate me">
              <LocateFixed />
            </Button>
            <Button variant="outline" size="icon" aria-label="Open filters" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal />
            </Button>
            {filtersOpen ? (
              <div className="fixed inset-0 z-50 flex justify-end bg-black/20" role="dialog" aria-modal="true" aria-labelledby="filters-title">
                <div className="dink-panel h-dvh w-full max-w-sm border-l bg-popover p-4 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 id="filters-title" className="text-lg font-semibold">Court hunt</h2>
                      <p className="text-sm text-muted-foreground">
                        Pick the borough, crowd, and access vibe.
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
                      <X />
                    </Button>
                  </div>
                  <div className="mt-5 flex flex-col gap-5">
                  <Field>
                    <FieldLabel>Borough</FieldLabel>
                    <Select
                      value={filters.borough}
                      onValueChange={(value) => setFilters((current) => ({ ...current, borough: value as Filters["borough"] }))}
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
                      onValueChange={(value) => setFilters((current) => ({ ...current, crowd: value as Filters["crowd"] }))}
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
                          setFilters((current) => ({ ...current, permit: value[0] as Filters["permit"] }));
                        }
                      }}
                      className="grid grid-cols-3 gap-2"
                    >
                      {(["All", "No permit", "Permit"] as Filters["permit"][]).map((value) => (
                        <ToggleGroupItem key={value} value={value} aria-label={value}>
                          {value}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>
                  <Button
                    variant={filters.accessible ? "default" : "outline"}
                    onClick={() => setFilters((current) => ({ ...current, accessible: !current.accessible }))}
                  >
                    <Accessibility data-icon="inline-start" />
                    Accessible courts only
                  </Button>
                  <Button variant={filters.nearMe ? "default" : "outline"} onClick={locateUser}>
                    <Crosshair data-icon="inline-start" />
                    {userLocation ? "Centered near me" : "Near me"}
                  </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div ref={mapContainer} className="map-shell absolute inset-x-0 bottom-0 top-16 z-0" />

      <aside className="dink-panel absolute bottom-0 left-0 top-16 z-10 hidden w-[390px] border-r backdrop-blur xl:block">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold">{filteredCourts.length} courts</div>
            <div className="text-xs text-muted-foreground">Public outdoor courts around NYC</div>
          </div>
          <Badge variant="outline" className="bg-background/70">
            <Zap data-icon="inline-start" />
            15 min
          </Badge>
        </div>
        {list}
      </aside>

      <div className="absolute bottom-4 left-4 right-4 z-10 xl:left-auto xl:right-5 xl:w-[390px]">
        <Card className="dink-panel rounded-md border-2 border-background/80 shadow-xl">
          <CardContent className="p-4">
            {selected ? (
              <CourtSummary court={selected} onReport={setReporting} />
            ) : (
              <div className="text-sm text-muted-foreground">Select a court to see the current estimate.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="absolute left-3 top-20 z-10 flex flex-wrap gap-2 xl:left-[410px]">
        {(["Low", "Moderate", "Busy", "Packed"] as CrowdLevel[]).map((level) => (
          <Badge key={level} variant="secondary" className="gap-2 border border-background/80 bg-background/95 shadow-sm">
            <span className="size-2 rounded-full" style={{ background: crowdColors[level] }} />
            {level}
          </Badge>
        ))}
      </div>

      <ReportPanel court={reporting} onClose={() => setReporting(null)} onSubmitted={updateCourt} />
    </div>
  );
}
