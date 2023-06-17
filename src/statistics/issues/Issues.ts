import { GitEvent, Period } from "../Statistics.js";
import { AbstractGitEventStatistics } from "../aggregate/Aggregate.js";
import { isBefore } from "date-fns";

type State = string | "opened" | "closed";

type IssueEvent = GitEvent & {
  project: number | string | undefined;
  id: number;
  state: State;
};

class IssueEventStatistics extends AbstractGitEventStatistics {
  constructor(readonly events: IssueEvent[], public readonly period: Period) {
    super(events, period);
  }

  protected get closedEvents(): GitEvent[] {
    return this.events.filter((issue) => issue.closedAt !== null && isBefore(issue.closedAt, this.period.end));
  }

  protected get openedEvents(): GitEvent[] {
    return this.events.filter(
      (issue) => issue.start !== null && (issue.closedAt === null || isBefore(this.period.end, issue.closedAt))
    );
  }

  protected timeSpent(difference: (dateLeft: Date, dateRight: Date) => number): { duration: number; length: number } {
    const events = this.closedEvents;
    const timeSpent = events.reduce((accumulator, currentValue) => {
      return accumulator + difference(currentValue.closedAt, currentValue.start);
    }, 0);
    return { duration: timeSpent, length: events.length };
  }
}

export { IssueEventStatistics, IssueEvent, State };
