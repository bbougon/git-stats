import * as crypto from "crypto";
import {
  addDays,
  addHours,
  differenceInCalendarDays,
  differenceInDays,
  eachWeekOfInterval,
  getWeek,
  parseISO,
} from "date-fns";
import { MergeEvent } from "../statistics/merge-events/MergeEvent.js";
import { CumulativeStatistic } from "../statistics/CumulativeStatistics";
import { IssueEvent } from "../statistics/issues/Issues";
import { GitEvent } from "../statistics/Statistics";

export class MergeEventBuilderForMR {
  private projectId: number;
  private _id: number;
  private _createdAt: Date;
  private _mergedAt: Date | null = null;
  private _closedAt: Date | null = null;

  constructor(projectId: number) {
    this.projectId = projectId;
    this._id = crypto.randomInt(2 ^ 16);
  }

  createdAt = (createdAt: Date): MergeEventBuilderForMR => {
    this._createdAt = createdAt;
    return this;
  };

  mergedAt = (mergedAt: Date): MergeEventBuilderForMR => {
    this._mergedAt = mergedAt;
    return this;
  };

  notYetMerged = (): MergeEventBuilderForMR => {
    this._mergedAt = null;
    this._closedAt = null;
    return this;
  };

  closedAt = (closedAt: Date): MergeEventBuilderForMR => {
    this._closedAt = closedAt;
    this._mergedAt = null;
    return this;
  };

  id = (id: number): MergeEventBuilderForMR => {
    this._id = id;
    return this;
  };

  build = (): MergeEvent => {
    return {
      start: this._createdAt,
      mergedAt: this._mergedAt,
      closedAt: this._closedAt,
      project: this.projectId,
      id: this._id,
    };
  };
}

interface Builder<M> {
  build(): M;
}

type GitEventsBuilderSpecification = {
  builder: (startDate: Date, endDate: Date | undefined) => GitEvent;
  startingState: number;
  closingState: number;
};

abstract class WeekGitEventsBuilder<T extends GitEvent, U> implements Builder<T[]> {
  protected _projectId: number;
  protected _period: { start: Date; end: Date };
  protected _weekNumber: number;

  forPeriod(period: { start: Date; end: Date }): this {
    this._period = period;
    return this;
  }

  forProject(projectId: number): this {
    this._projectId = projectId;
    return this;
  }

  build(): T[] {
    const events: GitEvent[] = [];
    const dates = eachWeekOfInterval(this._period);
    const specifications: GitEventsBuilderSpecification = this.specifications();
    dates.forEach((week) => {
      if (getWeek(week) === this._weekNumber) {
        for (let i = 0; i < specifications.startingState; i++) {
          const randomDayInWeek = addDays(week, Math.floor(Math.random() * (6 - 1) + 1));
          events.push(specifications.builder(randomDayInWeek, undefined));
        }
        for (let i = 0; i < specifications.closingState; i++) {
          const endOfDay = new Date(week.getFullYear(), week.getMonth(), week.getDate(), 23, 59);
          const randomDayInWeek = addDays(endOfDay, Math.floor(Math.random() * (6 - 2) + 2));
          const maxRange = differenceInDays(endOfDay, week);
          const startingDate =
            maxRange > 2
              ? addDays(endOfDay, -Math.floor(Math.random() * (maxRange - 2) + 2))
              : addHours(endOfDay, -Math.floor(Math.random() * (8 - 2) + 2));
          events.push(specifications.builder(startingDate, randomDayInWeek));
        }
      }
    });
    return events as T[];
  }

  abstract specifications(): GitEventsBuilderSpecification;
}

export class WeekPeriodMergeEventsBuilder extends WeekGitEventsBuilder<MergeEvent, WeekPeriodMergeEventsBuilder> {
  constructor(private readonly weekNumber: number, private readonly opened: number, private readonly merged: number) {
    super();
    this._weekNumber = weekNumber;
  }

  specifications(): GitEventsBuilderSpecification {
    const projectId = this._projectId;
    return {
      builder(startDate: Date, endDate: Date | undefined): GitEvent {
        if (endDate === undefined) {
          return new MergeEventBuilderForMR(projectId).createdAt(startDate).build();
        }
        return new MergeEventBuilderForMR(projectId).createdAt(startDate).mergedAt(endDate).build();
      },
      closingState: this.merged,
      startingState: this.opened,
    };
  }
}

export class WeekPeriodIssueEventsBuilder extends WeekGitEventsBuilder<IssueEvent, WeekPeriodIssueEventsBuilder> {
  constructor(private readonly weekNumber: number, private readonly opened: number, private readonly closed: number) {
    super();
    this._weekNumber = weekNumber;
  }

  specifications(): GitEventsBuilderSpecification {
    const projectId = this._projectId;
    return {
      builder(startDate: Date, endDate: Date | undefined): GitEvent {
        if (endDate === undefined) {
          return new IssueEventBuilder(projectId).createdAt(startDate).build();
        }
        return new IssueEventBuilder(projectId).createdAt(startDate).closedAt(endDate).build();
      },
      closingState: this.closed,
      startingState: this.opened,
    };
  }
}

export class RandomInPeriodMergeEventsBuilder extends WeekGitEventsBuilder<
  MergeEvent,
  RandomInPeriodMergeEventsBuilder
> {
  constructor(
    private readonly numberOfMergeRequests: number,
    private readonly emptyPeriodNumber: number = 0,
    private readonly doNotMergeYetRandomly: boolean = false
  ) {
    super();
  }

  build(): MergeEvent[] {
    const requests: MergeEvent[] = [];
    const daysInPeriod = differenceInCalendarDays(this._period.end, this._period.start);
    for (let i = 0; i < this.numberOfMergeRequests; i++) {
      let mergedAt: Date;
      if (i == 0) {
        mergedAt = addDays(this._period.start, 2);
        if (this.emptyPeriodNumber == undefined || getWeek(mergedAt) !== this.emptyPeriodNumber) {
          requests.push(
            new MergeEventBuilderForMR(this._projectId).createdAt(this._period.start).mergedAt(mergedAt).build()
          );
        }
      } else {
        const daysForCreation = Math.floor(Math.random() * (daysInPeriod - 1) + 1);
        const daysToMerge = Math.floor(Math.random() * (daysInPeriod - daysForCreation) + daysForCreation + 1);
        mergedAt = addDays(this._period.start, daysToMerge);
        if (this.emptyPeriodNumber == undefined || getWeek(mergedAt) !== this.emptyPeriodNumber) {
          let mergeRequestBuilder = new MergeEventBuilderForMR(this._projectId)
            .createdAt(addDays(this._period.start, daysForCreation))
            .mergedAt(mergedAt);
          if (this.doNotMergeYetRandomly && Math.random() > 0.8) {
            mergeRequestBuilder = mergeRequestBuilder.notYetMerged();
          }
          requests.push(mergeRequestBuilder.build());
        }
      }
    }
    return requests;
  }

  specifications(): GitEventsBuilderSpecification {
    return undefined;
  }
}

export class MergeEventsBuilderForMR {
  private _period: { start: Date; end: Date };
  private builders: WeekGitEventsBuilder<
    MergeEvent,
    WeekPeriodMergeEventsBuilder | RandomInPeriodMergeEventsBuilder
  >[] = [];

  constructor(private readonly projectId: number) {
    this._period = { start: parseISO("2021-01-01T00:00:00"), end: parseISO("2021-01-08T00:00:00") };
  }

  forPeriod = (from: Date, to: Date): MergeEventsBuilderForMR => {
    this._period = { start: from, end: to };
    return this;
  };
  inWeek = (builder: WeekPeriodMergeEventsBuilder): MergeEventsBuilderForMR => {
    this.builders.push(builder);
    return this;
  };

  randomly = (builder: RandomInPeriodMergeEventsBuilder): MergeEventsBuilderForMR => {
    this.builders.push(builder);
    return this;
  };

  build = (): MergeEvent[] => {
    const requests: MergeEvent[] = [];

    this.builders.forEach((builder) => {
      const mergeEvents = builder.forProject(this.projectId).forPeriod(this._period).build();
      requests.push(...mergeEvents);
    });
    return requests;
  };
}

export class IssueEventsBuilder {
  private _period: { start: Date; end: Date };
  private builders: WeekGitEventsBuilder<IssueEvent, WeekPeriodIssueEventsBuilder>[] = [];

  constructor(private readonly projectId: number) {
    this._period = { start: parseISO("2021-01-01T00:00:00"), end: parseISO("2021-01-08T00:00:00") };
  }

  inWeek(builder: WeekPeriodIssueEventsBuilder): IssueEventsBuilder {
    this.builders.push(builder);
    return this;
  }

  forPeriod(start: Date, end: Date): IssueEventsBuilder {
    this._period = { start, end };
    return this;
  }

  build = (): IssueEvent[] => {
    const issues: IssueEvent[] = [];

    this.builders.forEach((builder) => {
      const issueEvents = builder.forProject(this.projectId).forPeriod(this._period).build();
      issues.push(...issueEvents);
    });
    return issues;
  };
}

export class MergeEventBuilderForPR {
  private project: string | undefined;
  private id: number;
  private _createdAt: Date;
  private _mergedAt: Date;
  private closedAt: Date | null = null;

  constructor(project: string, id: number = crypto.randomInt(2 ^ 16)) {
    this.project = project;
    this.id = id;
  }

  createdAt = (createdAt: Date): MergeEventBuilderForPR => {
    this._createdAt = createdAt;
    return this;
  };

  mergedAt = (mergedAt: Date): MergeEventBuilderForPR => {
    this._mergedAt = mergedAt;
    return this;
  };

  notYetMerged = (): MergeEventBuilderForPR => {
    this._mergedAt = null;
    this.closedAt = null;
    return this;
  };

  closed = (closedAt: Date): MergeEventBuilderForPR => {
    this.closedAt = closedAt;
    return this;
  };

  noName = (): MergeEventBuilderForPR => {
    this.project = undefined;
    return this;
  };

  build = (): MergeEvent => {
    return {
      start: this._createdAt,
      mergedAt: this._mergedAt,
      closedAt: this.closedAt,
      project: this.project,
      id: this.id,
    };
  };
}

export class CumulativeStatisticBuilder {
  private index: number;
  private _opened: number;
  private _closed: number;

  atIndex = (index: number): CumulativeStatisticBuilder => {
    this.index = index;
    return this;
  };

  opened = (opened: number): CumulativeStatisticBuilder => {
    this._opened = opened;
    return this;
  };
  closed = (closed: number): CumulativeStatisticBuilder => {
    this._closed = closed;
    return this;
  };

  build = (): CumulativeStatistic => {
    return {
      index: this.index,
      period: { end: new Date(), start: new Date() },
      opened: this._opened,
      closed: this._closed,
      trend: 0,
    };
  };
}

export class IssueEventBuilder {
  private _createdAt: Date;
  private _closedAt: Date | null;
  constructor(private readonly projectId: number | undefined, private id: number = crypto.randomInt(2 ^ 16)) {
    this._closedAt = null;
  }

  createdAt = (createdAt: Date): IssueEventBuilder => {
    this._createdAt = createdAt;
    return this;
  };

  closedAt = (closedAt: Date): IssueEventBuilder => {
    this._closedAt = closedAt;
    return this;
  };

  withId = (id: number): IssueEventBuilder => {
    this.id = id;
    return this;
  };

  build = (): IssueEvent => {
    return {
      closedAt: this._closedAt,
      id: this.id,
      project: this.projectId,
      start: this._createdAt,
      state: this._closedAt === null ? "opened" : "closed",
    };
  };
}
