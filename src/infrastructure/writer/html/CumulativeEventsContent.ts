export type CumulativeEventsContent = {
  cumulative: {
    months: {
      openedData: number[];
      closedData: number[];
      trendData: number[];
      labels: string[];
    };
    weeks: {
      openedData: number[];
      closedData: number[];
      trendData: number[];
      labels: string[];
    };
  };
};
