import React from "react";
import { riskLabels, riskColors } from "./utils/colors";

interface Props {
  className?: string;
  labels?: string[];
  colors?: string[];
}

const RiskLegend: React.FC<Props> = ({
  className = "",
  labels = riskLabels,
  colors = riskColors,
}) => (
  <div className={`flex items-center space-x-2 ${className}`}>
    {labels.map((lbl, i) => (
      <div key={lbl} className="flex flex-col items-center">
        <div
          className="rounded"
          style={{ width: 42, height: 8, backgroundColor: colors[i] }}
        />
        <span className="text-[10px] mt-0.5 font-medium text-slate-800">
          {lbl}
        </span>
      </div>
    ))}
  </div>
);

export default RiskLegend;
