/* eslint-disable @typescript-eslint/no-explicit-any */
import ChartsWrapper from "../../Helper/ChartsWrapper";
import LineChartComponent from "@/components/Charts/LineChart";

const Charts = ({ data, theme }: { data: any; theme: string }) => {
  const time = data.time;

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(3, 1fr)",
        gridGap: "1px",
      }}
    >
      {Object.keys(data).map((key) => {
        return key !== "time" ? (
          <ChartsWrapper key={key} title={key.toLocaleUpperCase()}>
            <LineChartComponent values={data[key]} time={time} theme={theme} />
          </ChartsWrapper>
        ) : (
          <></>
        );
      })}

      {/* <ChartsWrapper title="Humidity">
        <MultiChart />
      </ChartsWrapper>
      <ChartsWrapper title="Wind Speed">
        <LineChartComponent values={data} />
      </ChartsWrapper> */}
    </div>
  );
};

export default Charts;
