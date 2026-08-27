import React, { useLayoutEffect, useMemo, useState } from "react";
import { Resizable } from "re-resizable";

interface CenteredForecastPanelProps {
  children: React.ReactNode;
  onClose: () => void;
  /** Usable width of the map content area (excluding side panel). */
  areaWidth: number;
  /** Usable height of the map content area. */
  areaHeight: number;
}

function Corner({ cursor }: { cursor: string }) {
  return (
    <div
      className="h-3 w-3 rounded-sm border border-black/10 bg-white/80 shadow"
      style={{ cursor }}
    />
  );
}

function Edge({ cursor }: { cursor: string }) {
  return (
    <div
      className="bg-black/5 opacity-0 transition-opacity hover:opacity-100"
      style={{ cursor, width: 12, height: "100%" }}
    />
  );
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const CENTER_GUTTER = 16;
const OUTER_PAD_X = 28;
const OUTER_PAD_Y = 12;
const MIN_W = 300;
const MIN_H = 220;

const CenteredForecastPanel: React.FC<CenteredForecastPanelProps> = ({
  children,
  onClose,
  areaWidth,
  areaHeight,
}) => {
  const bounds = useMemo(() => {
    const maxOuterWidth = Math.max(0, areaWidth - CENTER_GUTTER * 2);
    const maxOuterHeight = Math.max(0, areaHeight - CENTER_GUTTER * 2);
    const maxInnerWidth = Math.max(MIN_W, maxOuterWidth - OUTER_PAD_X * 2);
    const maxInnerHeight = Math.max(MIN_H, maxOuterHeight - OUTER_PAD_Y * 2);

    return { maxOuterWidth, maxOuterHeight, maxInnerWidth, maxInnerHeight };
  }, [areaWidth, areaHeight]);

  const { maxOuterWidth, maxOuterHeight, maxInnerWidth, maxInnerHeight } =
    bounds;

  const defaultSize = useMemo(
    () => ({
      width: Math.min(maxInnerWidth, Math.max(MIN_W, maxInnerWidth * 0.96)),
      height: Math.min(maxInnerHeight, Math.max(MIN_H, maxInnerHeight * 0.88)),
    }),
    [maxInnerWidth, maxInnerHeight]
  );

  const [size, setSize] = useState(defaultSize);

  useLayoutEffect(() => {
    if (areaWidth <= 0 || areaHeight <= 0) return;

    setSize({
      width: Math.min(maxInnerWidth, defaultSize.width),
      height: Math.min(maxInnerHeight, defaultSize.height),
    });
  }, [
    areaWidth,
    areaHeight,
    maxInnerWidth,
    maxInnerHeight,
    defaultSize.width,
    defaultSize.height,
  ]);

  const outerWidth = Math.min(
    maxOuterWidth,
    size.width + OUTER_PAD_X * 2
  );
  const outerHeight = Math.min(
    maxOuterHeight,
    size.height + OUTER_PAD_Y * 2
  );

  return (
    <div className="pointer-events-none relative flex h-full w-full min-w-0 items-center justify-center p-4">
      <div
        className="pointer-events-auto relative box-border max-h-full max-w-full overflow-hidden rounded-xl border border-gray-300 bg-white shadow-xl ring-1 ring-black/5"
        data-forecast-panel
        style={{
          width: outerWidth,
          height: outerHeight,
          maxWidth: maxOuterWidth,
          maxHeight: maxOuterHeight,
          paddingLeft: OUTER_PAD_X,
          paddingRight: OUTER_PAD_X,
          paddingTop: OUTER_PAD_Y,
          paddingBottom: OUTER_PAD_Y,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute z-20 flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-lg leading-none text-gray-500 shadow-none hover:border-transparent hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
          style={{ top: 2, right: 2 }}
          aria-label="Close forecast panel"
          title="Close"
        >
          ×
        </button>

        <div className="flex w-full justify-center">
          <Resizable
          size={size}
          minWidth={MIN_W}
          minHeight={MIN_H}
          maxWidth={maxInnerWidth}
          maxHeight={maxInnerHeight}
          grid={[12, 12]}
          onResize={(_e, _dir, _ref, delta) => {
            setSize((current) => ({
              width: clamp(
                current.width + delta.width,
                MIN_W,
                maxInnerWidth
              ),
              height: clamp(
                current.height + delta.height,
                MIN_H,
                maxInnerHeight
              ),
            }));
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
                className="bg-black/5 opacity-0 transition-opacity hover:opacity-100"
              />
            ),
            top: (
              <div
                style={{ cursor: "ns-resize", height: 12, width: "100%" }}
                className="bg-black/5 opacity-0 transition-opacity hover:opacity-100"
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
            overflow: "hidden",
            position: "relative",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,.12)",
            boxShadow: "0 10px 30px rgba(0,0,0,.15)",
            background: "white",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          <div
            className="forecast-card-scroll box-border h-full max-h-full w-full min-w-0 overflow-y-auto p-4 text-gray-900"
            style={{ scrollbarGutter: "stable" }}
            onWheelCapture={(e) => e.stopPropagation()}
            onTouchMoveCapture={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </Resizable>
        </div>
      </div>
    </div>
  );
};

export default CenteredForecastPanel;
