import React from "react";
import * as RTooltip from "@radix-ui/react-tooltip";

type Legend = {
  label?: React.ReactNode;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  rowContainerStyle?: React.CSSProperties;
  labelContainerStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  valueStyle?: React.CSSProperties;
};

type TooltipContentProps = React.ComponentProps<typeof RTooltip.Content>;

type TooltipCfg = {
  text: React.ReactNode;
  /** Pass any Radix <Tooltip.Content> props here (side, align, sideOffset, className, etc.) */
  contentProps?: Omit<TooltipContentProps, "children">;
  /** Optional per-item delay (ms). Falls back to Provider delayDuration below */
  delayDuration?: number;
};

export type Data = {
  value: number;        // segment weight (flex)
  color: string;        // segment color
  tooltip?: TooltipCfg; // tooltip for this segment
  legend?: Legend;      // label above the segment
};

interface Props {
  data: Data[];
  className?: string;
  rootStyle?: React.CSSProperties;
  barContainerStyle?: React.CSSProperties;
  legendContainerStyle?: React.CSSProperties;
}

const ColorBar = ({
  data,
  rootStyle,
  barContainerStyle,
  legendContainerStyle,
  className = "",
}: Props) => {
  if (!data || data.length === 0) {
    return <div style={rootStyle}>No data available</div>;
  }

  return (
    <RTooltip.Provider delayDuration={150}>
      <div style={rootStyle} className={className}>
        {/* ───── Legend values ───── */}
        <div
          style={{
            display: "flex",
            width: "100%",
            marginBottom: 5,
            ...legendContainerStyle,
          }}
        >
          {data.map((d, i) => (
            <div
              key={`legend-${i}`}
              style={{
                flex: d.value,
                textAlign: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "#333",
              }}
            >
              {d.legend?.value}
            </div>
          ))}
        </div>

        {/* ───── Color segments ───── */}
        <div
          style={{
            display: "flex",
            borderRadius: 5,
            overflow: "hidden",
            height: 10,
            width: "100%",
            ...barContainerStyle,
          }}
        >
          {data.map((d, i) => {
            const hasTip = !!d.tooltip;
            const contentProps = d.tooltip?.contentProps ?? {};
            const perItemDelay = d.tooltip?.delayDuration;

            return (
              <RTooltip.Root
                key={`seg-${i}`}
                delayDuration={
                  typeof perItemDelay === "number" ? perItemDelay : undefined
                }
              >
                <RTooltip.Trigger asChild>
                  <div
                    style={{
                      backgroundColor: d.color,
                      flex: d.value,
                      height: "100%",
                    }}
                    // Make it focusable for keyboard users to reveal tooltip
                    tabIndex={hasTip ? 0 : -1}
                  />
                </RTooltip.Trigger>

                {hasTip && (
                  <RTooltip.Content
                    side="top"
                    align="center"
                    sideOffset={6}
                    {...contentProps}
                  >
                    <span>{d.tooltip!.text}</span>
                    <RTooltip.Arrow />
                  </RTooltip.Content>
                )}
              </RTooltip.Root>
            );
          })}
        </div>
      </div>
    </RTooltip.Provider>
  );
};

export default ColorBar;