import * as crypto from "crypto";
import { addDays, differenceInCalendarDays, getWeek, parseISO } from "date-fns";
import { MergeEvent } from "../statistics/merge-events/MergeEvent";

export class MergeEventBuilderForMR {
  private projectId: number;
  private _id: number;
  private _createdAt: Date;
  private _mergedAt: Date;
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

export class MergeEventsBuilderForMR {
  private _projectId: number;
  private _numberOfMergeRequests: number;
  private _period: { from: Date; to: Date };
  private _emptyPeriodNumber: number | undefined = undefined;
  private _doNotMergeYetRandomly = false;
  constructor(projectId: number) {
    this._projectId = projectId;
    this._numberOfMergeRequests = 5;
    this._period = { from: parseISO("2021-01-01T00:00:00"), to: parseISO("2021-01-08T00:00:00") };
  }

  total = (numberOfMergeRequests: number): MergeEventsBuilderForMR => {
    this._numberOfMergeRequests = numberOfMergeRequests;
    return this;
  };

  forPeriod = (from: Date, to: Date): MergeEventsBuilderForMR => {
    this._period = { from, to };
    return this;
  };

  withEmptyPeriod = (periodNumber: number): MergeEventsBuilderForMR => {
    this._emptyPeriodNumber = periodNumber;
    return this;
  };

  randomlyNotMerged = (): MergeEventsBuilderForMR => {
    this._doNotMergeYetRandomly = true;
    return this;
  };

  build = (): MergeEvent[] => {
    const requests = [];
    const daysInPeriod = differenceInCalendarDays(this._period.to, this._period.from);
    for (let i = 0; i < this._numberOfMergeRequests; i++) {
      let mergedAt: Date;
      if (i == 0) {
        mergedAt = addDays(this._period.from, 2);
        if (this._emptyPeriodNumber == undefined || getWeek(mergedAt) !== this._emptyPeriodNumber) {
          requests.push(
            new MergeEventBuilderForMR(this._projectId).createdAt(this._period.from).mergedAt(mergedAt).build()
          );
        }
      } else {
        const daysForCreation = Math.floor(Math.random() * daysInPeriod) - 1;
        const daysToMerge = Math.floor(Math.random() * (daysInPeriod - daysForCreation) + daysForCreation + 1);
        mergedAt = addDays(this._period.from, daysToMerge);
        if (this._emptyPeriodNumber == undefined || getWeek(mergedAt) !== this._emptyPeriodNumber) {
          let mergeRequestBuilder = new MergeEventBuilderForMR(this._projectId)
            .createdAt(addDays(this._period.from, daysForCreation))
            .mergedAt(mergedAt);
          if (this._doNotMergeYetRandomly && Math.random() > 0.8) {
            mergeRequestBuilder = mergeRequestBuilder.notYetMerged();
          }
          requests.push(mergeRequestBuilder.build());
        }
      }
    }
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
