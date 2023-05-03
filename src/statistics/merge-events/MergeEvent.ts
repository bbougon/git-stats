import { compareAsc, differenceInHours } from "date-fns";
import moment from "moment";
import { Repository } from "../../Repository.js";
import { RequestParameters } from "../../../index.js";
import Duration from "../Duration.js";
import { GitEvent, GitEventsStatisticsResult, GitStatistics, Period } from "../Statistics.js";

type MergeEvent = GitEvent & {
  project: number | string | undefined;
  id: number;
  mergedAt: Date | null;
  closedAt: Date | null;
};

interface MergeEventRepository extends Repository<MergeEvent> {
  getMergeEventsForPeriod(requestParameters: RequestParameters): Promise<MergeEvent[]>;
}

type MergeEventsStatisticsResult = GitEventsStatisticsResult & {
  average: Duration;
  total: {
    merged: number;
    closed: number;
    opened: number;
    all: number;
  };
};

class MergeEventStatistics implements GitStatistics {
  constructor(private mergeEvents: MergeEvent[], public readonly period: Period) {}

  sortedEvents = (): MergeEvent[] => {
    return this.mergeEvents
      .sort((mr, mrToCompare) => compareAsc(mr.start, mrToCompare.start))
      .sort((mr, mrToCompare) => compareAsc(mr.mergedAt, mrToCompare.mergedAt));
  };

  result = (): MergeEventsStatisticsResult => {
    const mergedMergeRequests = this.mergeEvents.filter((mr) => mr.mergedAt !== null);
    const closedMergeRequests = this.mergeEvents.filter((mr) => mr.closedAt !== null);
    const openedMergeRequests = this.mergeEvents.filter((mr) => mr.mergedAt === null && mr.closedAt == null);
    const hoursSpent = mergedMergeRequests.reduce(
      (accumulator, currentValue) => accumulator + differenceInHours(currentValue.mergedAt, currentValue.start),
      0
    );
    const duration = moment.duration(hoursSpent / mergedMergeRequests.length, "hours");
    return {
      average: {
        months: parseInt(duration.months().toFixed()),
        days: parseInt(duration.days().toFixed()),
        hours: parseInt(duration.hours().toFixed()),
        minutes: parseInt(duration.minutes().toFixed()),
        seconds: parseInt(duration.seconds().toFixed()),
      },
      total: {
        merged: mergedMergeRequests.length,
        closed: closedMergeRequests.length,
        opened: openedMergeRequests.length,
        all: this.mergeEvents.length,
      },
    };
  };
}
export { MergeEvent, MergeEventRepository, MergeEventStatistics };
