// MyPopup.tsx
import React, {
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
  useMemo,
} from "react";
import { Popup, type PopupProps, useMap } from "react-leaflet";
import { Resizable } from "re-resizable";
import type { Popup as LeafletPopup } from "leaflet";

interface MyPopupProps extends PopupProps {
  children: React.ReactNode;
  /** Auto-maximize the first time on small screens (default true) */
  autoMaxOnSmall?: boolean;
}

/* ── Resize handles ──────────────────────────────────────────────────────── */
function Corner({ cursor }: { cursor: string }) {
  return (
    <div
      className="w-3 h-3 rounded-sm bg-white/80 shadow border border-black/10"
      style={{ cursor }}
    />
  );
}
function Edge({ cursor }: { cursor: string }) {
  return (
    <div
      className="opacity-0 hover:opacity-100 transition-opacity bg-black/5"
      style={{ cursor, width: 12, height: "100%" }}
    />
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const MyPopup: React.FC<MyPopupProps> = ({
  children,
  autoMaxOnSmall = true,
  ...popupProps
}) => {
  const map = useMap();
  const popupRef = useRef<LeafletPopup | null>(null);

  // Measure side panel + layer control so Leaflet autopan avoids them
  const [panelW, setPanelW] = useState(0);
  const [layersH, setLayersH] = useState(0);

  const measureChrome = () => {
    const sideEl = document.getElementById("sidePanel");
    const layersEl = document.querySelector(".leaflet-control-layers");
    if (sideEl) setPanelW(sideEl.getBoundingClientRect().width);
    if (layersEl)
      setLayersH((layersEl as HTMLElement).getBoundingClientRect().height);
  };

  useEffect(() => {
    measureChrome();
    window.addEventListener("resize", measureChrome);
    return () => window.removeEventListener("resize", measureChrome);
  }, []);

  // Compute viewport from the MAP (more accurate than window if the map isn't fullscreen)
  const { vw, vh } = useMemo(() => {
    if (!map) return { vw: window.innerWidth, vh: window.innerHeight };
    const s = map.getSize();
    return { vw: s.x, vh: s.y };
  }, [map, panelW, layersH]); // changes in chrome usually imply relayout

  const gutter = 10;
  const minW = 300;
  const minH = 220;

  const maxWidth = Math.max(minW, vw * 0.92 - panelW - gutter);
  const maxHeight = Math.max(minH + 20, vh * 0.88 - layersH - gutter);

  const padTL: [number, number] = [panelW + gutter, layersH + gutter];
  const padBR: [number, number] = [gutter, gutter];

  // Controlled size so we can Max/Reset/clamp
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({
    width: Math.min(vw * 0.92, maxWidth),
    height: maxHeight,
  }));
  const [isMax, setIsMax] = useState(false);

  // Throttle Leaflet's update() to once per frame
  const rafRef = useRef<number | null>(null);
  const scheduleUpdate = () => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      popupRef.current?.update();
      rafRef.current = null;
    });
  };

  const maximize = () => {
    setIsMax(true);
    setSize({ width: maxWidth, height: maxHeight });
    scheduleUpdate();
  };
  const restore = () => {
    setIsMax(false);
    setSize({ width: Math.min(vw * 0.92, maxWidth), height: maxHeight });
    scheduleUpdate();
  };

  // Auto-maximize on smaller viewports (once)
  useEffect(() => {
    if (!autoMaxOnSmall) return;
    if (vw < 1536) maximize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // Clamp size when viewport or chrome changes
  useLayoutEffect(() => {
    setSize((s) => ({
      width: clamp(s.width, minW, maxWidth),
      height: clamp(s.height, minH, maxHeight),
    }));
    scheduleUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxWidth, maxHeight]);

  // Re-run Leaflet autopan if our measurements or size change
  useEffect(() => {
    scheduleUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelW, layersH, size.width, size.height]);

  return (
    <Popup
      {...popupProps}
      ref={popupRef}
      className="!p-0"
      maxWidth={10000} // don't let Leaflet cap the width
      autoPan
      keepInView
      autoPanPaddingTopLeft={padTL}
      autoPanPaddingBottomRight={padBR}
    >
      <Resizable
        size={size}
        minWidth={minW}
        minHeight={minH}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        grid={[12, 12]} // subtle snap feel
        onResizeStart={() => {
          // TS-safe: we don't care about return value
          map?.dragging?.disable();
          // avoid map zoom while scrolling inside
          map?.scrollWheelZoom?.disable();
        }}
        onResize={(e, dir, ref, d) => {
          setSize((s) => ({
            width: s.width + d.width,
            height: s.height + d.height,
          }));
          scheduleUpdate();
        }}
        onResizeStop={() => {
          map?.dragging?.enable?.();
          map?.scrollWheelZoom?.enable?.();
          scheduleUpdate();
        }}
        handleComponent={{
          topLeft: <Corner cursor="nwse-resize" />,
          topRight: <Corner cursor="nesw-resize" />,
          bottomLeft: <Corner cursor="nesw-resize" />,
          bottomRight: <Corner cursor="nwse-resize" />,
          right: <Edge cursor="ew-resize" />,
          left: <Edge cursor="ew-resize" />,
          bottom: (
            <div
              style={{ cursor: "ns-resize", height: 12, width: "100%" }}
              className="opacity-0 hover:opacity-100 bg-black/5"
            />
          ),
          top: (
            <div
              style={{ cursor: "ns-resize", height: 12, width: "100%" }}
              className="opacity-0 hover:opacity-100 bg-black/5"
            />
          ),
        }}
        handleStyles={{
          right: { right: -6 },
          left: { left: -6 },
          top: { top: -6 },
          bottom: { bottom: -6 },
          topRight: { right: -6, top: -6 },
          topLeft: { left: -6, top: -6 },
          bottomRight: { right: -6, bottom: -6 },
          bottomLeft: { left: -6, bottom: -6 },
        }}
        style={{
          overflow: "hidden", // keep outer chrome clean
          position: "relative",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,.12)",
          boxShadow: "0 10px 30px rgba(0,0,0,.15)",
          background: "white",
        }}
      >
        {/* Tiny toolbar */}
        <div className="absolute right-2 top-2 z-[10] flex gap-1">
          <button
            className="px-2 py-1 text-xs rounded bg-black/5 hover:bg-black/10"
            onClick={() => (isMax ? restore() : maximize())}
            aria-label={isMax ? "Restore size" : "Maximize popup"}
          >
            {isMax ? "Restore" : "Maximize"}
          </button>
          <button
            className="px-2 py-1 text-xs rounded bg-black/5 hover:bg-black/10"
            onClick={restore}
            aria-label="Reset size"
          >
            Reset
          </button>
        </div>

        {/* Put scrolling inside your content, not on the resizable shell */}
        <div
          className="
            flex flex-col 2xl:flex-row h-[80vh] w-full p-4 gap-4
            overflow-y-auto 2xl:overflow-visible
            pb-28 2xl:pb-0
          "
          style={{ scrollbarGutter: "stable" }}
          // prevent wheel from bubbling to map (esp. Plotly)
          onWheelCapture={(e) => e.stopPropagation()}
          onTouchMoveCapture={(e) => e.stopPropagation()}
        >
          <div className="flex-1 min-w-0 min-h-0">
            <div className="h-full w-full">{children}</div>
          </div>
        </div>
      </Resizable>
    </Popup>
  );
};

export default MyPopup;
