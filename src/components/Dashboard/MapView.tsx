import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  GeoJSON,
  LayersControl,
  ScaleControl,
  ZoomControl,
  LayerGroup,
  useMap,
} from "react-leaflet";
import { format, addDays, addMonths, differenceInDays, min as minDate } from "date-fns";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { useQueryClient } from "@tanstack/react-query";

import CenteredForecastPanel from "./CenteredForecastPanel";
import PopupCharts from "./PopupCharts";
import Cards from "./Cards";
import SidePanel from "./SidePanel";
import ColorBar from "../Helper/Colorbar";
import Slider from "../Slider/Slider";
import { rgbMapping } from "../../constants/colorMapping";
import { fetchLegend, toColorBarData } from "./utils/legendApi";
import { prefetchChart, type Interval, type ChartData } from "./hooks/useChart";
import {
  normalizeZoneName,
  type ForecastLocationMarker,
} from "./hooks/useForecastMetadata";
import { useStaticJson } from "./hooks/useStaticJson";
import { formatWeekLabel } from "./utils/weekRange";
import { useDebounced } from "./hooks/useDebounced";
import { UI_TO_TILE_VAR } from "./constants/tileVars";

import ExportCsvButton from "./components/exportCsvButton";
import DownloadPngButton from "./components/downloadPngButton";
import ShareLinkButton from "./components/shareLinkButton";

const US_BOUNDS: L.LatLngBoundsExpression = [
  [24.0, -125.0], // SW
  [50.0, -66.0], // NE
];

const CAMERA_COORDS: [number, number] = [38.65673, -122.657];

const VARIABLE_MAPPING = UI_TO_TILE_VAR;

// Where {var}/{YYYYMMDD}/{z}/{x}/{y}.png tiles are served from. Defaults to the
// production Spaces bucket; override (e.g. VITE_TILE_BASE=/tiles) to preview
// locally generated tiles through the Vite dev proxy.
const TILE_BASE = (
  import.meta.env.VITE_TILE_BASE ||
  "https://usa-gridmet-map-data-do.sfo3.digitaloceanspaces.com"
).replace(/\/+$/, "");

// Map a slider position to the calendar day whose tiles should be shown.
// Mirrors getDisplayedTime(): hourly steps are hours within the range, daily
// steps are days, weekly/monthly steps jump to the start of each period.
// Tiles are daily, so hourly positions collapse onto their day. Clamped to
// the range end so a slider at max never asks for a date past "to".
function sliderToTileDate(
  interval: Interval,
  from: Date,
  to: Date,
  position: number
): Date {
  let d: Date;
  switch (interval) {
    case "hourly":
      d = addDays(from, Math.floor(position / 24));
      break;
    case "daily":
      d = addDays(from, position);
      break;
    case "weekly":
      d = addDays(from, position * 7);
      break;
    case "monthly":
      d = addMonths(from, position);
      break;
    default:
      d = from;
  }
  return minDate([d, to]);
}

const MAP_CENTER: [number, number] = [37.59, -120.84];

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow });
L.Marker.prototype.options.icon = DefaultIcon;

function MapZoomLock({ locked }: { locked: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (locked) {
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      map.boxZoom.disable();
    } else {
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      map.boxZoom.enable();
    }
  }, [map, locked]);

  return null;
}

function ActionBar({
  selectedVariable,
  interval,
  from,
  to,
  zone,
  t,
  data,
  disabled,
}: {
  selectedVariable: string;
  interval: Interval;
  from: string;
  to: string;
  zone: string;
  t: number;
  data: ChartData | undefined;
  disabled: boolean;
}) {
  return (
    <div className="mt-3 actionbar">
      {/* Fixed button sizing and layout */}
      <div
        className="
          grid grid-cols-1 gap-3 sm:grid-cols-3
          [&>div]:flex [&>div]:items-stretch
          [&>div>*]:m-0 [&>div>*]:h-12 [&>div>*]:w-full
        "
      >
        <div>
          <ExportCsvButton
            data={data}
            selectedVariable={selectedVariable}
            disabled={disabled}
            zone={zone}
            interval={interval}
          />
        </div>
        <div>
          <DownloadPngButton
            data={data}
            selectedVariable={selectedVariable}
            interval={interval}
            zone={zone}
          />
        </div>
        <div>
          <ShareLinkButton
            selectedVariable={selectedVariable}
            interval={interval}
            from={from}
            to={to}
            zone={zone}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

interface MapViewProps {
  sliderValue: number;
  setSliderValue: React.Dispatch<React.SetStateAction<number>>;
  selectedVariable: string;
  interval: Interval;
  calendarRange: { from: Date; to: Date };
  zone: string;
  setZone: (zone: string) => void;
  chartData: ChartData | undefined;
  isFetching?: boolean;
  error?: unknown;
  supportedZones?: string[];
  locationMarkers?: ForecastLocationMarker[];
  locationOptions?: string[];
  locationsLoading?: boolean;
  setInterval: React.Dispatch<React.SetStateAction<Interval>>;
  setCalendarRange: React.Dispatch<
    React.SetStateAction<{ from: Date; to: Date }>
  >;
  setSelectedVariable: React.Dispatch<React.SetStateAction<string>>;
  /** NEW: open the popup automatically only when URL asked for it (popup=1) */
  autoOpenPopup?: boolean;
}

const { BaseLayer, Overlay } = LayersControl;

const MapView: React.FC<MapViewProps> = ({
  sliderValue,
  setSliderValue,
  selectedVariable,
  interval,
  calendarRange,
  zone,
  setZone,
  chartData,
  isFetching,
  error,
  supportedZones = [],
  locationMarkers = [],
  locationOptions = [],
  locationsLoading = false,
  setInterval,
  setCalendarRange,
  setSelectedVariable,
  autoOpenPopup = false, // NEW default
}) => {
  const debouncedSlider = useDebounced(sliderValue, 80);
  const [popupOpen, setPopupOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const [mapAreaSize, setMapAreaSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 320);
    return () => window.clearTimeout(id);
  }, [sidePanelOpen]);

  useEffect(() => {
    const el = mapAreaRef.current;
    if (!el) return;

    const update = () => {
      setMapAreaSize({ w: el.clientWidth, h: el.clientHeight });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  const [legendBar, setLegendBar] = useState<any[] | null>(null);
  const [legendError, setLegendError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const supportedZoneSet = useMemo(
    () => new Set(supportedZones.map(normalizeZoneName)),
    [supportedZones]
  );
  const forecastLocations = useMemo(() => {
    const filteredLocations = supportedZones.length
      ? locationMarkers.filter((marker) =>
          supportedZoneSet.has(normalizeZoneName(marker.zone))
        )
      : locationMarkers;
    const hasAmplicam = filteredLocations.some(
      (marker) => normalizeZoneName(marker.zone) === "amplicam"
    );
    const supportsAmplicam =
      !supportedZones.length || supportedZoneSet.has("amplicam");
    if (hasAmplicam || !supportsAmplicam) return filteredLocations;
    return [
      ...filteredLocations,
      {
        location: "Amplicam_Camera_pointwise",
        zone: "Amplicam",
        lat: CAMERA_COORDS[0],
        lon: CAMERA_COORDS[1],
      },
    ];
  }, [locationMarkers, supportedZones, supportedZoneSet]);

  const cameraIcon = useMemo(
    () =>
      L.icon({
        iconUrl: "/images/cameraIcon.png",
        iconSize: [20, 20],
        iconAnchor: [12, 12],
        popupAnchor: [0, -10],
      }),
    []
  );

  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

  // Stable start/end strings for query keys + prefetch
  const startStr = useMemo(
    () => format(calendarRange.from, "yyyy-MM-dd"),
    [calendarRange.from]
  );
  const endStr = useMemo(
    () => format(calendarRange.to, "yyyy-MM-dd"),
    [calendarRange.to]
  );

  // Prefetch helper using the SAME key as the useChart hook
  const prefetch = (locName: string) => {
    if (!locName) return;
    if (
      supportedZones.length &&
      !supportedZoneSet.has(normalizeZoneName(locName))
    )
      return;
    prefetchChart(queryClient, {
      zone: locName,
      start: startStr,
      end: endStr,
      interval,
    });
  };

  const handleZoneSelect = useCallback(
    (selectedZone: string) => {
      setZone(selectedZone);
      if (!selectedZone) return;
      if (
        supportedZones.length &&
        !supportedZoneSet.has(normalizeZoneName(selectedZone))
      )
        return;
      prefetchChart(queryClient, {
        zone: selectedZone,
        start: startStr,
        end: endStr,
        interval,
      });
      setPopupOpen(true);
    },
    [
      setZone,
      startStr,
      endStr,
      interval,
      supportedZones,
      supportedZoneSet,
      queryClient,
    ]
  );

  // Use the debounced slider so a drag doesn't fire a tile request per pixel.
  const tileDateStr = useMemo(
    () =>
      format(
        sliderToTileDate(
          interval,
          calendarRange.from,
          calendarRange.to,
          debouncedSlider
        ),
        "yyyyMMdd"
      ),
    [interval, calendarRange.from, calendarRange.to, debouncedSlider]
  );

  const tileUrl = useMemo(() => {
    const varCode = VARIABLE_MAPPING[selectedVariable] ?? "tmmx";
    return `${TILE_BASE}/${varCode}/${tileDateStr}/{z}/{x}/{y}.png`;
  }, [selectedVariable, tileDateStr]);

  useEffect(() => {
    const varCode = VARIABLE_MAPPING[selectedVariable];
    if (!varCode) {
      setLegendError("Unknown variable");
      setLegendBar(null);
      return;
    }
    setLegendError(null);
    setLegendBar(null);

    // default options per variable (match your server PALETTES)
    const opts =
      selectedVariable === "fireWeatherIndex" ||
      selectedVariable === "severeFireDangerIndex"
        ? {
            breaks: [0, 5, 12, 25, 40, 60],
            labels: ["Low", "Moderate", "Elevated", "High", "Severe"],
          }
        : selectedVariable === "heatStressIndex"
        ? { steps: 11 }
        : { steps: 10 };

    fetchLegend(varCode, opts)
      .then((resp) => setLegendBar(toColorBarData(resp)))
      .catch((e) => setLegendError(String(e)));
  }, [selectedVariable]);

  // OPEN THE POPUP ONLY WHEN URL ASKED FOR IT (popup=1)
  useEffect(() => {
    if (!zone || !autoOpenPopup) return;

    setPopupOpen(true);

    const url = new URL(window.location.href);
    url.searchParams.delete("popup");
    window.history.replaceState(null, "", url.toString());
  }, [zone, autoOpenPopup]);

  const activeLocation = useMemo(
    () => forecastLocations.find((marker) => marker.zone === zone),
    [forecastLocations, zone]
  );

  const sideInsetLeft = sidePanelOpen ? 312 : 44;
  const forecastAreaWidth = Math.max(0, mapAreaSize.w - sideInsetLeft);
  const forecastAreaHeight = Math.max(0, mapAreaSize.h - 32);

  const [showLines, setShowLines] = useState(false);

  const { data: linesData } = useStaticJson<any>(
    "https://usa-gridmet-map-data-do.sfo3.digitaloceanspaces.com/Electric-Power-Transmission-Lines.geojson",
    { enabled: showLines }
  );

  const { data: palisadesData } = useStaticJson<any>("/data/Palisades.geojson");
  const { data: smokehouseData } = useStaticJson<any>(
    "/data/SmokehouseCreek.geojson"
  );
  const { data: texasData } = useStaticJson<any>(
    "/data/TexasPerimeter.geojson"
  );
  const { data: eatonData } = useStaticJson<any>("/data/Eaton.geojson");

  const { data: powerPlantsCa } = useStaticJson<any>(
    "/data/power_plants_CA.geojson"
  );

  const { data: solarFootprintsCA } = useStaticJson<any>(
    "/data/solar_footprints_wgs84.geojson"
  );

  const { data: transmissionLinesCA } = useStaticJson<any>(
    "/data/transmission_lines.geojson"
  );

  const getDisplayedTime = () => {
    let currentDate = new Date(calendarRange.from);
    if (interval === "hourly") {
      currentDate = addDays(calendarRange.from, Math.floor(sliderValue / 24));
      return currentDate.toDateString() + ` ${sliderValue % 24}:00`;
    } else if (interval === "daily") {
      currentDate = addDays(calendarRange.from, sliderValue);
      return currentDate.toDateString();
    } else if (interval === "weekly") {
      return formatWeekLabel(calendarRange.from);
    } else if (interval === "monthly") {
      currentDate.setMonth(calendarRange.from.getMonth() + sliderValue);
      return currentDate.toDateString();
    }
    return calendarRange.from.toDateString();
  };

  const cardsLoading = interval === "weekly" || isFetching || chartData == null;

  return (
    <div ref={mapAreaRef} className="relative h-full w-full">
      <MapContainer
        center={MAP_CENTER}
        zoom={6}
        zoomControl={false}
        preferCanvas={true}
        style={{ width: "100%", height: "100%" }}
      >
        <MapZoomLock locked={popupOpen} />

        <ScaleControl position="bottomleft" imperial={true} />
        <LayersControl position="topright">
          {/* Base layer (OSM) */}
          <BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>

          {/* Dynamic tile overlay for GridMET data */}

          <Overlay checked name="Variable map">
            {tileUrl && (
              <TileLayer
                key={tileUrl} // force re-render when date/style changes
                url={tileUrl}
                minZoom={0}
                maxZoom={14}
                // Tiles are built to z9 (GridMET is 4 km; finer zooms add nothing).
                // Leaflet upscales z9 tiles beyond this instead of requesting z10+.
                maxNativeZoom={9}
                opacity={0.7}
                crossOrigin={true}
                noWrap={true}
                bounds={US_BOUNDS}
                // 1x1 transparent PNG for any soft-miss; keeps console quiet
                errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAsMB+1g1+1QAAAAASUVORK5CYII="
              />
            )}
          </Overlay>

          {/* Transmission lines */}
          <Overlay name="US Transmission Lines">
            <LayerGroup
              eventHandlers={{
                add: () => setShowLines(true),
                remove: () => setShowLines(false),
              }}
            >
              {showLines && linesData && (
                <GeoJSON
                  data={linesData}
                  pathOptions={{
                    renderer: canvasRenderer,
                    interactive: false,
                    color: "#444",
                    weight: 1,
                    opacity: 0.8,
                  }}
                />
              )}
            </LayerGroup>
          </Overlay>

          <Overlay name="CA Transmission Lines">
            {transmissionLinesCA && (
              <GeoJSON
                data={transmissionLinesCA}
                pathOptions={{
                  renderer: canvasRenderer,
                  interactive: false,
                  color: "#6B7280", // tailwind gray-500-ish
                  weight: 1,
                  opacity: 0.85,
                }}
              />
            )}
          </Overlay>

          <Overlay name="CA Solar Footprints">
            {solarFootprintsCA && (
              <GeoJSON
                data={solarFootprintsCA}
                style={{
                  color: "#CA8A04", // outline (amber-600)
                  weight: 1,
                  fillColor: "#FDE047", // fill (amber-300)
                  fillOpacity: 0.25,
                }}
                // turn off interactions if you don't need clicks
                pathOptions={{ renderer: canvasRenderer, interactive: false }}
              />
            )}
          </Overlay>

          <Overlay name="CA Power Plants">
            {powerPlantsCa && (
              <GeoJSON
                data={powerPlantsCa}
                // draw points as tiny circle markers
                pointToLayer={(_feature: any, latlng: L.LatLng) =>
                  L.circleMarker(latlng, {
                    radius: 3,
                    weight: 1,
                    color: "#B91C1C", // red-700
                    fillOpacity: 0.9,
                  })
                }
                // optional: quick popup with first ~10 props
                onEachFeature={(feature: any, layer: L.Layer) => {
                  const p = feature?.properties || {};
                  const name =
                    p.name ||
                    p.NAME ||
                    p.Plant ||
                    p.Plant_Name ||
                    p.station ||
                    "Power Plant";
                  const rows = Object.entries(p)
                    .slice(0, 10)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("<br/>");
                  (layer as any).bindPopup(
                    `<strong>${name}</strong><br/><small>${rows}</small>`
                  );
                }}
                pathOptions={{ renderer: canvasRenderer }}
              />
            )}
          </Overlay>

          <Overlay name="Texas Perimeter">
            {texasData && (
              <GeoJSON
                data={texasData}
                style={{ color: "black", weight: 5, fill: false }}
              />
            )}
          </Overlay>

          {/* Eaton Fire Perimeter */}
          <Overlay name="Eaton Fire">
            {eatonData && (
              <GeoJSON
                data={eatonData}
                style={{ color: "black", weight: 2, fill: false }}
              />
            )}
          </Overlay>

          {/* Palisades Fire Perimeter */}
          <Overlay name="Palisades Fire">
            {palisadesData && (
              <GeoJSON
                data={palisadesData}
                style={{ color: "black", weight: 2, fill: false }}
              />
            )}
          </Overlay>

          {/* Smokehouse Fire Perimeter */}
          <Overlay name="Smokehouse Fire">
            {smokehouseData && (
              <GeoJSON
                data={smokehouseData}
                style={{ color: "black", weight: 2, fill: false }}
              />
            )}
          </Overlay>

        </LayersControl>

        {!popupOpen && <ZoomControl position="topright" />}

        {/* Markers */}
        {forecastLocations.map((marker) => (
          <Marker
            key={marker.location}
            position={[marker.lat, marker.lon]}
            {...(normalizeZoneName(marker.zone) === "amplicam"
              ? { icon: cameraIcon }
              : {})}
            eventHandlers={{
              mouseover: () => prefetch(marker.zone),
              click: () => {
                setZone(marker.zone);
                prefetch(marker.zone);
                setPopupOpen(true);
              },
            }}
          />
        ))}
      </MapContainer>

      {popupOpen && activeLocation && forecastAreaWidth > 0 && (
        <div
          className="pointer-events-none absolute bottom-4 right-0 top-4 z-[1100]"
          style={{ left: sideInsetLeft }}
        >
          <CenteredForecastPanel
            areaWidth={forecastAreaWidth}
            areaHeight={forecastAreaHeight}
            onClose={() => setPopupOpen(false)}
          >
            <div className="flex flex-col gap-4">
              <div className="min-w-0">
                <div className="h-[400px] w-full shrink-0 md:h-[460px]">
                  <PopupCharts
                    data={chartData}
                    selectedVariable={selectedVariable}
                    isFetching={isFetching}
                    error={error}
                    zone={activeLocation.zone}
                    interval={interval}
                  />
                </div>
              </div>

              <div className="w-full">
                <h2 className="mb-4 text-lg font-bold">
                  {activeLocation.zone} Forecast
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Cards
                    dense
                    title="Max Temperature"
                    value={chartData?.temperature_maximum?.max}
                    loading={cardsLoading}
                    className="min-h-[80px]"
                  />
                  <Cards
                    dense
                    title="Min Temperature"
                    value={chartData?.temperature_minimum?.min}
                    loading={cardsLoading}
                    className="min-h-[80px]"
                  />
                  <Cards
                    dense
                    title="Max Wind Speed"
                    value={chartData?.wind_speed?.max}
                    loading={cardsLoading}
                    className="min-h-[80px]"
                  />
                  <Cards
                    dense
                    title="Min Relative Humidity"
                    value={chartData?.relative_humidity_minimum?.max}
                    loading={cardsLoading}
                    className="min-h-[80px]"
                  />
                  <Cards
                    dense
                    title="Max Fire Weather Index"
                    value={chartData?.fire_weather_index?.max}
                    loading={cardsLoading}
                    className="min-h-[80px]"
                  />
                  <Cards
                    dense
                    title="Max Severe Fire Danger Index"
                    value={chartData?.severe_fire_danger_index?.max}
                    loading={cardsLoading}
                    className="min-h-[80px]"
                  />
                  <Cards
                    dense
                    title="Max Burning Index"
                    value={chartData?.burn_index?.max}
                    loading={cardsLoading}
                    className="min-h-[80px]"
                  />
                  <Cards
                    dense
                    title="Max Energy Release Component"
                    value={chartData?.energy_release_component?.max}
                    loading={cardsLoading}
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <ActionBar
                  selectedVariable={selectedVariable}
                  interval={interval}
                  from={startStr}
                  to={endStr}
                  zone={activeLocation.zone}
                  t={sliderValue}
                  data={chartData}
                  disabled={cardsLoading}
                />
              </div>
            </div>
          </CenteredForecastPanel>
        </div>
      )}

      <div
        className={[
          "absolute left-3 top-4 z-[1000]",
          "transition-transform duration-300 ease-in-out",
          popupOpen ? "bottom-4" : "bottom-16",
          sidePanelOpen
            ? "translate-x-0"
            : "-translate-x-[calc(100%+0.75rem)]",
        ].join(" ")}
      >
        <div
          id="sidePanel"
          data-collapsed={sidePanelOpen ? undefined : "true"}
          className="flex h-full w-[300px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white/70 shadow-xl ring-1 ring-black/5 backdrop-blur"
        >
          <div className="flex shrink-0 items-center justify-end p-0">
            <button
              type="button"
              onClick={() => setSidePanelOpen(false)}
              className="cursor-pointer border-0 bg-transparent p-0 pr-[10px] text-lg leading-none text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            aria-label="Hide side panel"
            title="Hide panel"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ‹
            </span>
            </button>
          </div>

          <div className="side-panel-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-0">
            <SidePanel
              interval={interval}
              setInterval={setInterval}
              calendarRange={calendarRange}
              setCalendarRange={setCalendarRange}
              selectedVariable={selectedVariable}
              setSelectedVariable={setSelectedVariable}
              locationOptions={locationOptions}
              zone={zone}
              onZoneChange={handleZoneSelect}
              locationsLoading={locationsLoading}
            />
          </div>
        </div>
      </div>

      {!sidePanelOpen && (
        <div
          className={[
            "absolute left-3 z-[1200] flex items-center",
            popupOpen ? "top-4 bottom-4" : "top-4 bottom-16",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => setSidePanelOpen(true)}
            className="flex cursor-pointer items-center justify-center border-0 bg-transparent p-2 shadow-none hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            aria-label="Show side panel"
            title="Show panel"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white/70 text-gray-600 shadow-xl ring-1 ring-black/5 backdrop-blur">
              <span aria-hidden="true" className="text-base leading-none">
                ›
              </span>
            </span>
          </button>
        </div>
      )}

      {!popupOpen && (
        <div className="absolute bottom-0 left-1/2 z-[900] w-[480px] max-w-[calc(100%-1.5rem)] -translate-x-1/2">
          <ColorBar
            data={rgbMapping[selectedVariable]}
            rootStyle={{ padding: "3px 3px 0", borderRadius: "4px 4px 0 0" }}
          />
          <Slider
            key={interval}
            value={sliderValue}
            setValue={setSliderValue}
            max={
              interval === "hourly"
                ? (differenceInDays(calendarRange.to, calendarRange.from) + 1) *
                  24
                : interval === "daily"
                ? differenceInDays(calendarRange.to, calendarRange.from) + 1
                : interval === "weekly"
                ? Math.ceil(
                    (differenceInDays(calendarRange.to, calendarRange.from) + 1) / 7
                  )
                : interval === "monthly"
                ? Math.ceil(
                    (differenceInDays(calendarRange.to, calendarRange.from) +
                      1) /
                      30
                  )
                : differenceInDays(calendarRange.to, calendarRange.from) + 1
            }
            displayedTime={getDisplayedTime()}
          />
        </div>
      )}
    </div>
  );
};

export default MapView;
