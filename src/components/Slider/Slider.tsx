/* SliderRedesigned.tsx
   ────────────────────────────────────────────────────────────
   • Thumb is rendered on top of the track (z-10) so it never gets hidden.
   • Track base + fill are pointer-events:none so they don’t block dragging.
   • Same prop contract → <Slider … /> works without changes.
*/

import React from 'react';

export type SliderProps = {
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  max: number;
  displayedTime: string;
  className?: string;
};

const Slider: React.FC<SliderProps> = ({
  value,
  setValue,
  max,
  displayedTime,
  className = '',
}) => {
  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setValue(Number(e.target.value));

  const fillPct = (value / (max - 1)) * 100;

  return (
    <div
      className={`rounded-xl bg-slate-800/60 backdrop-blur p-4 flex flex-col gap-2 w-full ${className}`}
    >
      {/* label */}
      <p className="text-center text-white text-sm font-light select-none">
        {displayedTime}
      </p>

      {/* slider wrapper */}
      <div className="relative w-full h-5">
        {/* base track */}
        <div className="absolute inset-0 rounded-full bg-slate-700 pointer-events-none" />

        {/* fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 pointer-events-none"
          style={{ width: `min(calc(${fillPct}% + 9px), 100%)` }}
        />

        {/* actual <input type="range" /> */}
        <input
          type="range"
          min={0}
          max={max - 1}
          value={value}
          onChange={handle}
          className="absolute inset-0 w-full h-5 appearance-none bg-transparent cursor-pointer z-10"
        />
      </div>

      {/* custom thumb css */}
      <style>
        {`
          /* Chrome / Safari */
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 18px;
            width: 18px;
            border-radius: 50%;
            background: #ffffff;
            box-shadow: 0 0 4px rgba(0,0,0,.35);
            transition: transform 0.15s ease;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.25);
          }

          /* Firefox */
          input[type="range"]::-moz-range-thumb {
            height: 18px;
            width: 18px;
            border-radius: 50%;
            background: #ffffff;
            border: none;
            box-shadow: 0 0 4px rgba(0,0,0,.35);
            transition: transform 0.15s ease;
          }
          input[type="range"]::-moz-range-thumb:hover {
            transform: scale(1.25);
          }
        `}
      </style>
    </div>
  );
};

export default Slider;