import { compareAsc, differenceInHours } from "date-fns";
import moment from "moment";
import { GitEvent, GitEventsStatisticsResult, GitStatistics, Period } from "../GitStatistics.js";
import { Repository } from "../../Repository.js";
import { RequestParameters } from "../../../index.js";
import Duration from "../Duration.js";

type MergeEvent = GitEvent & {
  project: number | string | undefined;
  id: number;
  createdAt: Date;
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

class MergedEventStatistics implements GitStatistics {
  constructor(private mergeEvents: MergeEvent[], public readonly period: Period) {}

  sortedEvents = (): MergeEvent[] => {
    return this.mergeEvents
      .sort((mr, mrToCompare) => compareAsc(mr.createdAt, mrToCompare.createdAt))
      .sort((mr, mrToCompare) => compareAsc(mr.mergedAt, mrToCompare.mergedAt));
  };

  result = (): MergeEventsStatisticsResult => {
    const mergedMergeRequests = this.mergeEvents.filter((mr) => mr.mergedAt !== null);
    const closedMergeRequests = this.mergeEvents.filter((mr) => mr.closedAt !== null);
    const openedMergeRequests = this.mergeEvents.filter((mr) => mr.mergedAt === null && mr.closedAt == null);
    const hoursSpent = mergedMergeRequests.reduce(
      (accumulator, currentValue) => accumulator + differenceInHours(currentValue.mergedAt, currentValue.createdAt),
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

const mergeEventsStatistics = (
  repository: MergeEventRepository,
  requestParameter: RequestParameters
): Promise<MergedEventStatistics> => {
  return repository.getMergeEventsForPeriod(requestParameter).then((mergeEvents) => {
    return new MergedEventStatistics(mergeEvents, { end: requestParameter.toDate, start: requestParameter.fromDate });
  });
};

export { MergeEvent, MergeEventRepository, MergedEventStatistics, mergeEventsStatistics };
