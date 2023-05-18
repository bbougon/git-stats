export type StatisticsEventsContent = {
  events: {
    months: {
      data: number[];
      labels: string[];
      average: number[];
      median: number[];
    };
    weeks: {
      data: number[];
      labels: string[];
      average: number[];
      median: number[];
    };
  };
};
