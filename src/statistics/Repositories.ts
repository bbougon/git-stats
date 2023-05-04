import { MergeEvent } from "./merge-events/MergeEvent.js";
import { IssueEvent } from "./issues/Issues.js";
import { EventRepository } from "./EventRepository.js";

abstract class Repositories {
  private static repositories: Repositories;

  static initialize(repositories: Repositories) {
    Repositories.repositories = repositories;
  }

  static mergeEvent(): EventRepository<MergeEvent> {
    return Repositories.repositories.getMergeEventRepository();
  }

  static issueEvent(): EventRepository<IssueEvent> {
    return Repositories.repositories.getIssueEventRepository();
  }

  protected abstract getMergeEventRepository(): EventRepository<MergeEvent>;

  protected abstract getIssueEventRepository(): EventRepository<IssueEvent>;
}

export { Repositories };
