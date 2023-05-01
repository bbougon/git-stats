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
      createdAt: this._createdAt,
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

interface MergeEventsBuilder<T> extends Builder<MergeEvent[]> {
  build(): MergeEvent[];

  forPeriod(period: { start: Date; end: Date }): T;

  forProject(projectId: number): T;
}

export class WeekPeriodMergeEventsBuilder implements MergeEventsBuilder<WeekPeriodMergeEventsBuilder> {
  private _period: { start: Date; end: Date };
  private _projectId: number;

  constructor(private readonly weekNumber: number, private readonly opened: number, private readonly merged: number) {}

  build(): MergeEvent[] {
    const events: MergeEvent[] = [];
    const dates = eachWeekOfInterval(this._period);
    dates.forEach((week) => {
      if (getWeek(week) === this.weekNumber) {
        for (let i = 0; i < this.opened; i++) {
          const randomDayInWeek = addDays(week, Math.floor(Math.random() * (6 - 1) + 1));
          events.push(new MergeEventBuilderForMR(this._projectId).createdAt(randomDayInWeek).build());
        }
        for (let i = 0; i < this.merged; i++) {
          const endOfDay = new Date(week.getFullYear(), week.getMonth(), week.getDate(), 23, 59);
          const randomDayInWeek = addDays(endOfDay, Math.floor(Math.random() * (6 - 2) + 2));
          const maxRange = differenceInDays(endOfDay, week);
          events.push(
            new MergeEventBuilderForMR(this._projectId)
              .createdAt(
                maxRange > 2
                  ? addDays(endOfDay, -Math.floor(Math.random() * (maxRange - 2) + 2))
                  : addHours(endOfDay, -Math.floor(Math.random() * (8 - 2) + 2))
              )
              .mergedAt(randomDayInWeek)
              .build()
          );
        }
      }
    });
    return events;
  }

  forPeriod(period: { start: Date; end: Date }): WeekPeriodMergeEventsBuilder {
    this._period = period;
    return this;
  }

  forProject(projectId: number): WeekPeriodMergeEventsBuilder {
    this._projectId = projectId;
    return this;
  }
}

export class RandomInPeriodMergeEventsBuilder implements MergeEventsBuilder<RandomInPeriodMergeEventsBuilder> {
  private _period: { start: Date; end: Date };
  private _projectId: number;

  constructor(
    private readonly numberOfMergeRequests: number,
    private readonly emptyPeriodNumber: number = 0,
    private readonly doNotMergeYetRandomly: boolean = false
  ) {}

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

  forPeriod(period: { start: Date; end: Date }): RandomInPeriodMergeEventsBuilder {
    this._period = period;
    return this;
  }

  forProject(projectId: number): RandomInPeriodMergeEventsBuilder {
    this._projectId = projectId;
    return this;
  }
}

export class MergeEventsBuilderForMR {
  private _projectId: number;
  private _period: { start: Date; end: Date };
  private builders: MergeEventsBuilder<WeekPeriodMergeEventsBuilder | RandomInPeriodMergeEventsBuilder>[] = [];

  constructor(projectId: number) {
    this._projectId = projectId;
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
      const mergeEvents = builder.forProject(this._projectId).forPeriod(this._period).build();
      requests.push(...mergeEvents);
    });
    return requests;
  };
}

export class MergeEventBuilderForPR {
  private project: string | undefined;
  private id: number;
  private _createdAt: Date;
  private _mergedAt: Date;
  private closedAt: Date | null = null;

  constructor(project: string) {
    this.project = project;
    this.id = crypto.randomInt(2 ^ 16);
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
    this._mergedAt = null;
    return this;
  };

  noName = (): MergeEventBuilderForPR => {
    this.project = undefined;
    return this;
  };

  build = (): MergeEvent => {
    return {
      createdAt: this._createdAt,
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
