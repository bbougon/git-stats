import { Repository } from "../Repository";
import { MergeEvent, MergeEventRepository } from "../statistics/merge-events/MergeEvent";
import { MergeRequestsStatsParameters } from "../statistics/Gitlab";
import { compareAsc, compareDesc } from "date-fns";
import { PullRequestsStatsParameter } from "../statistics/Github";

abstract class MemoryRepository<T> implements Repository<T> {
  protected entities: T[] = [];

  persist(entity: T) {
    this.entities.push(entity);
  }
}

export class MergeRequestMemoryRepository extends MemoryRepository<MergeEvent> implements MergeEventRepository {
  getMergeEventsForPeriod = (requestParameters: MergeRequestsStatsParameters): Promise<MergeEvent[]> => {
    const mergeRequests = this.entities.filter(
      (mergeRequest) =>
        mergeRequest.project == requestParameters.projectId &&
        compareAsc(mergeRequest.start, requestParameters.fromDate) >= 0 &&
        compareDesc(mergeRequest.start, requestParameters.toDate) >= 0
    );
    return Promise.all(
      mergeRequests
        .sort((mr, mrToCompare) => compareAsc(mr.start, mrToCompare.start))
        .sort((mr, mrToCompare) => compareAsc(mr.mergedAt, mrToCompare.mergedAt))
    );
  };

  persistAll(mergeRequests: MergeEvent[]): void {
    this.entities.push(...mergeRequests);
  }
}

export class PullRequestMemoryRepository extends MemoryRepository<MergeEvent> implements MergeEventRepository {
  getMergeEventsForPeriod = (requestParameters: PullRequestsStatsParameter): Promise<MergeEvent[]> => {
    const mergeRequests = this.entities.filter(
      (mergeRequest) =>
        mergeRequest.project == requestParameters.repo &&
        compareAsc(mergeRequest.start, requestParameters.fromDate) >= 0 &&
        compareDesc(mergeRequest.start, requestParameters.toDate) >= 0
    );
    return Promise.all(
      mergeRequests
        .sort((mr, mrToCompare) => compareAsc(mr.start, mrToCompare.start))
        .sort((mr, mrToCompare) => compareAsc(mr.mergedAt, mrToCompare.mergedAt))
    );
  };

  persistAll(mergeRequests: MergeEvent[]): void {
    this.entities.push(...mergeRequests);
  }
}
