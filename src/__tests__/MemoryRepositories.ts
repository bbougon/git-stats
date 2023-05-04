import { Repository } from "../Repository.js";
import { MergeEvent } from "../statistics/merge-events/MergeEvent.js";
import { GitlabEventParameters } from "../statistics/Gitlab.js";
import { compareAsc, compareDesc } from "date-fns";
import { PullRequestsStatsParameter } from "../statistics/Github.js";
import { IssueEvent } from "../statistics/issues/Issues.js";
import { RequestParameters } from "../../index.js";
import { Repositories } from "../statistics/Repositories.js";
import { EventRepository } from "../statistics/EventRepository";

abstract class MemoryRepository<T> implements Repository<T> {
  protected entities: T[] = [];

  persist(entity: T) {
    this.entities.push(entity);
  }

  persistAll(entities: T[]) {
    this.entities.push(...entities);
  }
}

export class MergeRequestMemoryRepository extends MemoryRepository<MergeEvent> implements EventRepository<MergeEvent> {
  getEventsForPeriod = (requestParameters: GitlabEventParameters): Promise<MergeEvent[]> => {
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
}

export class PullRequestMemoryRepository extends MemoryRepository<MergeEvent> implements EventRepository<MergeEvent> {
  getEventsForPeriod = (requestParameters: PullRequestsStatsParameter): Promise<MergeEvent[]> => {
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
}

export class IssueEventsMemoryRepository extends MemoryRepository<IssueEvent> implements EventRepository<IssueEvent> {
  getEventsForPeriod(requestParameters: RequestParameters): Promise<IssueEvent[]> {
    const issueEvents = this.entities.filter(
      (issueEvent) =>
        compareAsc(issueEvent.start, requestParameters.fromDate) >= 0 &&
        compareDesc(issueEvent.start, requestParameters.toDate) >= 0
    );
    return Promise.resolve(issueEvents);
  }
}

export class GitlabMemoryRepositories extends Repositories {
  private issueEventsMemoryRepository = new IssueEventsMemoryRepository();
  private mergeRequestMemoryRepository = new MergeRequestMemoryRepository();

  constructor() {
    super();
    Repositories.initialize(this);
  }

  getIssueEventRepository(): EventRepository<IssueEvent> {
    return this.issueEventsMemoryRepository;
  }

  getMergeEventRepository(): EventRepository<MergeEvent> {
    return this.mergeRequestMemoryRepository;
  }
}

export class GithubMemoryRepositories extends Repositories {
  private issueEventsMemoryRepository = new IssueEventsMemoryRepository();
  private pullRequestMemoryRepository = new PullRequestMemoryRepository();

  constructor() {
    super();
    Repositories.initialize(this);
  }

  getIssueEventRepository(): EventRepository<IssueEvent> {
    return this.issueEventsMemoryRepository;
  }

  getMergeEventRepository(): EventRepository<MergeEvent> {
    return this.pullRequestMemoryRepository;
  }
}
