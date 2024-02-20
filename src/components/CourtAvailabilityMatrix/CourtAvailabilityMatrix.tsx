import { Dispatch, ReactElement, SetStateAction, useState } from "react";
import {
  CourtAvailabilityResponse,
  TenantsResponse,
} from "../../api/platomicApi";

import styled from "styled-components";
import {
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  formatDate,
} from "date-fns";

import { pl } from "date-fns/locale";

type CourtAvailabilityMatrixProps = {
  placeInfo: TenantsResponse | null;
  courtInfo: CourtAvailabilityResponse[] | null;
  lastUpdated: Date;
  startDate: Date;
  setStartDate: Dispatch<SetStateAction<Date>>;
};

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  user-select: none;
`;

const Grid = styled.div<{
  $columns: number;
  $rows: number;
}>`
  display: grid;
  grid-template-columns: auto repeat(${(props) => props.$columns}, 1fr);
  grid-template-rows: auto repeat(${(props) => props.$rows}, 1fr);
  column-gap: 4px;
  row-gap: 4px;
  width: 100%;
`;

export const GridCell = styled.div`
  place-self: stretch;
  touch-action: none;
`;

export const Subtitle = styled.h2`
  font-size: 20px;
  font-weight: 400;
  color: rgba(79, 79, 79, 1);
  text-align: center;

  @media (max-width: 700px) {
    font-size: 18px;
  }
`;

const DateLabel = styled(Subtitle)`
  @media (max-width: 699px) {
    font-size: 12px;
  }
  margin: 0;
  margin-bottom: 4px;
`;

export const Text = styled.p`
  font-size: 14px;
  font-weight: 300;
  line-height: ${14 * 1.37}px;
  color: rgba(79, 79, 79, 0.87);
  margin: 5px 0;
`;

const TimeText = styled(Text)`
  @media (max-width: 699px) {
    font-size: 10px;
  }
  text-align: right;
  margin: 0;
  margin-right: 4px;
`;

const DateCell = styled.div<{
  $available: boolean;
}>`
  width: 100%;
  height: 25px;
  background-color: ${(props) =>
    props.$available ? "rgba(89, 154, 242, 1)" : "rgba(79, 79, 79, 0.87)"};  
  }

  &:hover {
    background-color: ${(props) =>
      props.$available ? "rgba(162, 198, 248, 1)" : "rgba(79, 79, 79, 0.87)"};
  }
`;

const CourtAvailabilityMatrix: React.FC<CourtAvailabilityMatrixProps> = (
  props
) => {
  //if null then loading
  if (!props.placeInfo || !props.courtInfo) {
    return <p>Loading</p>;
  }

  const days = 7;
  const min_time = 12;
  const max_time = 24;
  const minutesInChunk = 30;
  const hourlyChunks = 2;

  const startTime = startOfDay(props.startDate);
  const dates: Date[][] = [];

  for (let d = 0; d < days; d += 1) {
    const currentDay = [];
    for (let h = min_time; h < max_time; h += 1) {
      for (let c = 0; c < hourlyChunks; c += 1) {
        currentDay.push(
          addMinutes(addHours(addDays(startTime, d), h), c * minutesInChunk)
        );
      }
    }
    dates.push(currentDay);
  }

  const gridElements: ReactElement[] = [];
  const numDays = dates.length;
  const numTimes = dates[0].length;

  const slot_duration = 90;
  const doubleCourts = new Set(
    props.placeInfo.resources
      .filter((x) => x.properties.resource_size === "single")
      .map((x) => x.resource_id)
  );

  const availableSlots = new Map<string, string[]>();

  for (let i = 0; i < props.courtInfo.length; i += 1) {
    const availabilitySlotStartDate = props.courtInfo[i].start_date;
    const resourceId = props.courtInfo[i].resource_id;
    if (!doubleCourts.has(resourceId)) {
      continue;
    }
    for (let j = 0; j < props.courtInfo[i].slots.length; j += 1) {
      if (props.courtInfo[i].slots[j].duration !== slot_duration) {
        continue;
      }

      const slotStartTime = props.courtInfo[i].slots[j].start_time;
      const availableDateTime = new Date(
        `${availabilitySlotStartDate}T${slotStartTime}`
      );
      availableDateTime.setHours(availableDateTime.getHours() + 1);
      if (!availableSlots.has(availableDateTime.toISOString())) {
        availableSlots.set(availableDateTime.toISOString(), []);
      }

      availableSlots.get(availableDateTime.toISOString())!.push(resourceId);
    }
  }

  for (let j = 0; j < numTimes; j += 1) {
    const time = dates[0][j];
    gridElements.push(
      <TimeText key={formatDate(time, "HH:mm")}>
        {formatDate(time, "HH:mm")}
      </TimeText>
    );
    for (let i = 0; i < numDays; i += 1) {
      gridElements.push(
        <GridCell key={dates[i][j].toISOString()}>
          <DateCell
            $available={availableSlots.has(dates[i][j].toISOString())}
          />
        </GridCell>
      );
    }
    gridElements.push(<div key={`empty-${j}`}></div>);
  }

  return (
    <>
      <Wrapper>
        <Grid $columns={numDays + 1} $rows={numTimes + 1}>
          <div></div>
          {/* <button
            disabled={isSameDay(props.startDate, new Date())}
            onClick={() => props.setStartDate((prev) => addDays(prev, -days))}
          >
            Previous
          </button> */}
          {dates.map((x) => (
            <GridCell key={x[0].toISOString()}>
              <DateLabel>
                {formatDate(x[0], "dd.MM (eee)", { locale: pl })}
              </DateLabel>
            </GridCell>
          ))}
          <div></div>
          {/* <button
            disabled={isSameDay(props.startDate, addDays(new Date(), 7))}
            onClick={() => props.setStartDate((prev) => addDays(prev, days))}
          >
            Next
          </button> */}
          {gridElements}
        </Grid>
      </Wrapper>
      <div>
        Ostatnio aktualizowane:{" "}
        {formatDate(props.lastUpdated.toISOString(), "yyyy-MM-dd HH:mm:ss")}
      </div>
    </>
  );
};

export default CourtAvailabilityMatrix;
