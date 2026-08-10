import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  GeoJSON,
  LayersControl,
  ScaleControl,
  LayerGroup,
} from "react-leaflet";
import { format, addDays, differenceInDays } from "date-fns";
import "leaflet/dist/leaflet.css";
import type { Marker as LeafletMarker } from "leaflet";

import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { useQueryClient } from "@tanstack/react-query";

import MyPopup from "./MyPopup";
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
import { useDebounced } from "./hooks/useDebounced";

import ExportCsvButton from "./components/exportCsvButton";
import DownloadPngButton from "./components/downloadPngButton";
import ShareLinkButton from "./components/shareLinkButton";

const US_BOUNDS: L.LatLngBoundsExpression = [
  [24.0, -125.0], // SW
  [50.0, -66.0], // NE
];

const CAMERA_COORDS: [number, number] = [38.65673, -122.657];

const VARIABLE_MAPPING: Record<string, string> = {
  relativeHumMax: "rmax",
  relativeHumMin: "rmin",
  temperatureMax: "tmmx",
  temperatureMin: "tmmn",
  windSpeed: "vs",
  fireWeatherIndex: "fwi",
  heatStressIndex: "hsi",
  severeFireDangerIndex: "sfdi",
};

const MAP_CENTER: [number, number] = [37.59, -120.84];

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow });
L.Marker.prototype.options.icon = DefaultIcon;

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
          grid grid-cols-1 gap-3 sm:grid-cols-3 2xl:grid-cols-1
          [&>div]:flex [&>div]:items-stretch
          [&>div>*]:w-full [&>div>*]:h-12 [&>div>*]:m-0
          [&>div>*]:flex [&>div>*]:items-center [&>div>*]:justify-center
          [&>div>*]:leading-none [&>div>*]:text-sm [&>div>*]:font-medium
          [&>div>*]:border [&>div>*]:border-gray-300 [&>div>*]:rounded-md
          [&>div>*]:bg-white [&>div>*]:hover:bg-gray-50
          [&>div>*]:transition-colors [&>div>*]:duration-200
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
  setInterval,
  setCalendarRange,
  setSelectedVariable,
  autoOpenPopup = false, // NEW default
}) => {
  const debouncedSlider = useDebounced(sliderValue, 80);
  const [popupOpen, setPopupOpen] = useState(false);
  const [legendBar, setLegendBar] = useState<any[] | null>(null);
  const [legendError, setLegendError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});
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

  const tileUrl = useMemo(() => {
    const varCode = VARIABLE_MAPPING[selectedVariable] ?? "tmmx";
    const dateStr = "20250101";
    return `https://usa-gridmet-map-data-do.sfo3.digitaloceanspaces.com/${varCode}/${dateStr}/{z}/{x}/{y}.png`;
  }, [selectedVariable]);

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

    let raf = 0;
    const tryOpen = (tries = 0) => {
      const m = markerRefs.current[zone];
      if (m && m.getPopup()) {
        m.openPopup();
        requestAnimationFrame(() => m.getPopup()?.update());

        // One-shot: remove `popup` so refresh goes back to map view
        const url = new URL(window.location.href);
        url.searchParams.delete("popup");
        window.history.replaceState(null, "", url.toString());
        return;
      }
      if (tries < 30) raf = requestAnimationFrame(() => tryOpen(tries + 1));
    };

    tryOpen();
    return () => cancelAnimationFrame(raf);
  }, [zone, autoOpenPopup]);

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
    } else if (interval === "monthly") {
      currentDate.setMonth(calendarRange.from.getMonth() + sliderValue);
      return currentDate.toDateString();
    }
    return calendarRange.from.toDateString();
  };

  const cardsLoading = isFetching || chartData == null;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={MAP_CENTER}
        zoom={6}
        preferCanvas={true}
        style={{ width: "100%", height: "100%" }}
      >
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
                maxNativeZoom={11}
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

        {/* Markers & Popups */}
        {forecastLocations.map((marker) => (
          <Marker
            key={marker.location}
            ref={(ref) => {
              markerRefs.current[marker.zone] = ref;
            }}
            position={[marker.lat, marker.lon]}
            {...(normalizeZoneName(marker.zone) === "amplicam"
              ? { icon: cameraIcon }
              : {})}
            eventHandlers={{
              mouseover: () => prefetch(marker.zone),
              click: () => {
                setZone(marker.zone);
                prefetch(marker.zone);
              },
              popupopen: (e) => {
                setPopupOpen(true);
                prefetch(marker.zone);
                requestAnimationFrame(() => {
                  const marker = e?.target as L.Marker;
                  marker?.getPopup()?.update();
                });
              },
              popupclose: () => setPopupOpen(false),
            }}
          >
            <MyPopup>
              <div className="flex flex-col 2xl:flex-row h-[75vh] w-full p-4 gap-4 overflow-y-auto 2xl:overflow-visible">
                {/* Chart column */}
                <div className="flex-1 min-w-0">
                  <div className="h-[60vh] 2xl:h-full">
                    <PopupCharts
                      data={chartData}
                      selectedVariable={selectedVariable}
                      isFetching={isFetching}
                      error={error}
                      zone={marker.zone}
                      interval={interval}
                    />
                  </div>

                  {/* Actions under the chart on <2xl */}
                  <div className="2xl:hidden">
                    <ActionBar
                      selectedVariable={selectedVariable}
                      interval={interval}
                      from={startStr}
                      to={endStr}
                      zone={marker.zone}
                      t={sliderValue}
                      data={chartData}
                      disabled={cardsLoading}
                    />
                  </div>
                </div>

                {/* Right rail - Fixed width and card layout */}
                <div className="2xl:w-[480px] w-full 2xl:min-w-[480px]">
                  <div className="2xl:flex 2xl:flex-col 2xl:h-full 2xl:min-h-0">
                    {/* Cards scroll area with proper sizing */}
                    <div className="2xl:flex-1 2xl:min-h-0 2xl:overflow-auto 2xl:pr-2">
                      <h2 className="font-bold mb-4 text-lg">
                        {marker.zone} Forecast
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 2xl:gap-4">
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

                    {/* Actions fixed at bottom on ≥2xl with proper spacing */}
                    <div className="hidden 2xl:block 2xl:mt-4 2xl:pt-4 2xl:border-t 2xl:border-gray-200">
                      <ActionBar
                        selectedVariable={selectedVariable}
                        interval={interval}
                        from={startStr}
                        to={endStr}
                        zone={marker.zone}
                        t={sliderValue}
                        data={chartData}
                        disabled={cardsLoading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </MyPopup>
          </Marker>
        ))}
      </MapContainer>

      <div
        id="sidePanel"
        className="
   absolute top-4 left-12 z-[1000]
   w-[300px] max-h-[calc(100vh-6rem)] overflow-y-auto
   p-2 rounded-xl bg-white/70 backdrop-blur
   border border-gray-200 shadow-xl ring-1 ring-black/5
 "
      >
        <SidePanel
          interval={interval}
          setInterval={setInterval}
          calendarRange={calendarRange}
          setCalendarRange={setCalendarRange}
          selectedVariable={selectedVariable}
          setSelectedVariable={setSelectedVariable}
        />
      </div>

      {!popupOpen && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[900] w-[480px]">
          <ColorBar
            data={rgbMapping[selectedVariable]}
            rootStyle={{ padding: "3px", borderRadius: "4px" }}
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
