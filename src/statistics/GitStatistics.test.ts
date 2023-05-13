import { parseISO } from "date-fns";
import { MergeEvent } from "./merge-events/MergeEvent.js";
import {
  CumulativeStatisticBuilder,
  IssueEventBuilder,
  IssueEventsBuilder,
  MergeEventBuilderForMR,
  MergeEventBuilderForPR,
  MergeEventsBuilderForMR,
  RandomInPeriodMergeEventsBuilder,
  WeekPeriodIssueEventsBuilder,
  WeekPeriodMergeEventsBuilder,
} from "../__tests__/builder.js";
import { gitStatistics, Unit, Year } from "./GitStatistics.js";
import { GitlabEventParameters } from "./Gitlab.js";
import Duration from "./Duration.js";
import { CumulativeStatistic, TrendCalculator } from "./CumulativeStatistics";
import { PullRequestsStatsParameter } from "./Github";
import {
  GithubMemoryRepositories,
  GitlabMemoryRepositories,
  IssueEventsMemoryRepository,
  MergeRequestMemoryRepository,
  PullRequestMemoryRepository,
} from "../__tests__/MemoryRepositories";
import { MergedEventsStatisticFlow } from "./MergedEventsStatistics";
import { RequestParameters } from "../../index";
import { Repositories } from "./Repositories";
import { EventRepository } from "./EventRepository";

describe("Git Statistics", () => {
  function getEventDate() {
    return (mr: MergeEvent) => ({ end: mr.mergedAt, start: mr.start });
  }

  describe("Merge events", () => {
    describe("Aggregated statistics", () => {
      beforeEach(() => {
        new GitlabMemoryRepositories();
      });
      it("should have merge events average", async () => {
        const repository: EventRepository<MergeEvent> = Repositories.mergeEvent();
        repository.persist(
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2022-02-11T00:00:00"))
            .mergedAt(parseISO("2022-02-14T00:00:00"))
            .build()
        );
        repository.persist(
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2022-02-18T00:00:00"))
            .mergedAt(parseISO("2022-02-20T00:00:00"))
            .build()
        );
        repository.persist(
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2022-02-19T00:00:00"))
            .mergedAt(parseISO("2022-02-23T00:00:00"))
            .build()
        );
        repository.persist(
          new MergeEventBuilderForMR(2)
            .createdAt(parseISO("2022-02-13T00:00:00"))
            .mergedAt(parseISO("2022-02-15T00:00:00"))
            .build()
        );

        const stats = (
          await gitStatistics({
            projectId: 1,
            fromDate: parseISO("2022-02-11T00:00:00"),
            toDate: parseISO("2022-02-25T00:00:00"),
          } as GitlabEventParameters)
        ).mergeEvents.result();

        expect(stats.results).toEqual({
          average: { months: 0, days: 3, hours: 0, minutes: 0, seconds: 0 },
          total: { all: 3, merged: 3, closed: 0, opened: 0 },
        });
      });

      it("should have merge events average when merge request is not merged yet", async () => {
        const repository: EventRepository<MergeEvent> = Repositories.mergeEvent();
        repository.persist(
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2022-05-11T12:35:37"))
            .mergedAt(parseISO("2022-05-12T13:40:22"))
            .build()
        );
        repository.persist(
          new MergeEventBuilderForMR(1).createdAt(parseISO("2022-05-13T14:54:12")).notYetMerged().build()
        );

        const stats = (
          await gitStatistics({
            projectId: 1,
            fromDate: parseISO("2022-05-08T00:00:00"),
            toDate: parseISO("2022-05-15T00:00:00"),
          } as GitlabEventParameters)
        ).mergeEvents.result();

        expect(stats.results).toEqual({
          average: { months: 0, days: 1, hours: 1, minutes: 4, seconds: 45 },
          total: { all: 2, merged: 1, closed: 0, opened: 1 },
        });
      });

      it("should have merge events average with closed merge requests", async () => {
        const repository: EventRepository<MergeEvent> = Repositories.mergeEvent();
        repository.persist(
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2022-05-11T12:35:37"))
            .mergedAt(parseISO("2022-05-12T13:40:22"))
            .build()
        );
        repository.persist(
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2022-05-13T14:54:12"))
            .closedAt(parseISO("2022-05-14T14:54:12"))
            .build()
        );

        const stats = (
          await gitStatistics({
            projectId: 1,
            fromDate: parseISO("2022-05-08T00:00:00"),
            toDate: parseISO("2022-05-15T00:00:00"),
          } as GitlabEventParameters)
        ).mergeEvents.result();

        expect(stats.results).toEqual({
          average: { months: 0, days: 1, hours: 1, minutes: 4, seconds: 45 },
          total: { all: 2, merged: 1, closed: 1, opened: 0 },
        });
      });

      it("should have merge events average for duration greater than a month", async () => {
        const repository: EventRepository<MergeEvent> = Repositories.mergeEvent();
        repository.persist(
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2022-01-10T12:34:25"))
            .mergedAt(parseISO("2022-02-14T17:22:54"))
            .build()
        );

        const stats = (
          await gitStatistics({
            projectId: 1,
            fromDate: parseISO("2022-01-01T00:00:00"),
            toDate: parseISO("2022-02-25T00:00:00"),
          } as GitlabEventParameters)
        ).mergeEvents.result();

        expect(stats.results).toEqual({
          average: { months: 1, days: 4, hours: 4, minutes: 48, seconds: 29 },
          total: { all: 1, merged: 1, closed: 0, opened: 0 },
        });
      });
    });

    describe("Merged Events Statistics by period", () => {
      let repository: MergeRequestMemoryRepository | PullRequestMemoryRepository;

      beforeEach(() => {
        new GitlabMemoryRepositories();
        repository = Repositories.mergeEvent() as MergeRequestMemoryRepository;
      });

      it("should sort the periods", async () => {
        const start = parseISO("2022-02-01T00:00:00");
        const end = parseISO("2022-02-28T00:00:00");
        const mergeEvents = new MergeEventsBuilderForMR(1)
          .randomly(new RandomInPeriodMergeEventsBuilder(20, 7))
          .forPeriod(start, end)
          .build();
        (Repositories.mergeEvent() as MergeRequestMemoryRepository).persistAll(mergeEvents);

        const eventsByPeriod = (
          await gitStatistics({
            projectId: 1,
            fromDate: start,
            toDate: end,
          } as GitlabEventParameters)
        ).mergedEventsStatistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;

        const month = eventsByPeriod.get(2022)[0].Month[0];
        expect(month.index).toEqual(1);
        expect(month.events).toHaveLength(mergeEvents.length);
        const weeks = eventsByPeriod.get(2022)[1].Week;
        expect(weeks.flatMap((week) => week.index)).toStrictEqual([6, 7, 8, 9, 10]);
        expect(weeks[1].total()).toEqual(0);
      });

      it("should sort by period unit with all expected period units", async () => {
        const start = parseISO("2023-01-01T00:00:00");
        const end = parseISO("2023-02-10T00:00:00");
        const mergeEvents = new MergeEventsBuilderForMR(1)
          .randomly(new RandomInPeriodMergeEventsBuilder(78))
          .forPeriod(start, end)
          .build();
        repository.persistAll(mergeEvents);

        const eventsByPeriod = (
          await gitStatistics({
            projectId: 1,
            fromDate: start,
            toDate: end,
          } as GitlabEventParameters)
        ).mergedEventsStatistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;

        const months = eventsByPeriod.get(2023)[0].Month;
        expect(months.flatMap((month) => month.index)).toStrictEqual([0, 1]);
        const weeks = eventsByPeriod.get(2023)[1].Week;
        expect(weeks.flatMap((week) => week.index)).toStrictEqual([1, 2, 3, 4, 5, 6]);
      });

      it("should sort period when year overlaps", async () => {
        const start = parseISO("2022-10-01T00:00:00");
        const end = parseISO("2023-03-28T00:00:00");
        const mergeEvents = new MergeEventsBuilderForMR(1)
          .randomly(new RandomInPeriodMergeEventsBuilder(120, 0, true))
          .forPeriod(start, end)
          .build();
        repository.persistAll(mergeEvents);

        const eventsByPeriod = (
          await gitStatistics({
            projectId: 1,
            fromDate: start,
            toDate: end,
          } as GitlabEventParameters)
        ).mergedEventsStatistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;

        const monthsIn2022 = eventsByPeriod.get(2022)[0].Month;
        expect(monthsIn2022.flatMap((month) => month.index)).toStrictEqual([9, 10, 11]);
        const weeksIn2022 = eventsByPeriod.get(2022)[1].Week;
        expect(weeksIn2022.flatMap((week) => week.index)).toStrictEqual([
          40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
        ]);
        const monthsIn2023 = eventsByPeriod.get(2023)[0].Month;
        expect(monthsIn2023.flatMap((month) => month.index)).toStrictEqual([0, 1, 2]);
        const weeksIn2023 = eventsByPeriod.get(2023)[1].Week;
        expect(weeksIn2023.flatMap((week) => week.index)).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
      });

      it("should fill empty periods", async () => {
        const start = parseISO("2020-01-01T00:00:00");
        const end = parseISO("2020-12-31T00:00:00");
        const mergeEvents = [
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2020-03-01T00:00:00"))
            .mergedAt(parseISO("2020-03-12T00:00:00"))
            .build(),
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2020-06-08T00:00:00"))
            .mergedAt(parseISO("2020-06-09T00:00:00"))
            .build(),
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2020-08-12T00:00:00"))
            .mergedAt(parseISO("2020-08-14T00:00:00"))
            .build(),
        ];
        repository.persistAll(mergeEvents);

        const eventsByPeriod = (
          await gitStatistics({
            projectId: 1,
            fromDate: start,
            toDate: end,
          } as GitlabEventParameters)
        ).mergedEventsStatistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;

        const monthsIn2020 = eventsByPeriod.get(2020)[0].Month;
        expect(monthsIn2020.flatMap((month) => month.index)).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      });

      it("should fill empty periods in the middle of a year", async () => {
        new GithubMemoryRepositories();
        repository = Repositories.mergeEvent() as PullRequestMemoryRepository;
        const start = parseISO("2021-08-01T00:00:00");
        const end = parseISO("2021-08-31T00:00:00");
        const mergeEvents = [
          new MergeEventBuilderForPR("crm-pilates", 702124235)
            .createdAt(parseISO("2021-08-03T09:44:16.000Z"))
            .mergedAt(parseISO("2021-08-03T09:44:24.000Z"))
            .closed(parseISO("2021-08-03T09:44:24.000Z"))
            .build(),
          new MergeEventBuilderForPR("crm-pilates", 717283366)
            .createdAt(parseISO("2021-08-22T10:06:35.000Z"))
            .mergedAt(parseISO("2021-08-22T10:09:15.000Z"))
            .closed(parseISO("2021-08-22T10:09:15.000Z"))
            .build(),
        ];
        repository.persistAll(mergeEvents);

        const eventsByPeriod = (
          await gitStatistics({
            repo: "crm-pilates",
            owner: "someone",
            fromDate: start,
            toDate: end,
          } as PullRequestsStatsParameter)
        ).mergedEventsStatistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;

        const months = eventsByPeriod.get(2021)[0].Month;
        expect(months.flatMap((month) => month.index)).toStrictEqual([7]);
        const weeks = eventsByPeriod.get(2021)[1].Week;
        expect(weeks.flatMap((month) => month.index)).toStrictEqual([32, 33, 34, 35, 36]);
      });

      it("should create all periods if it does exactly one year", async () => {
        new GithubMemoryRepositories();
        repository = Repositories.mergeEvent() as PullRequestMemoryRepository;
        const start = parseISO("2021-03-01T00:00:00");
        const end = parseISO("2022-03-02T00:00:00");
        const mergeEvents = [
          new MergeEventBuilderForPR("crm-pilates", 702124235)
            .createdAt(parseISO("2021-03-01T09:44:16.000Z"))
            .mergedAt(parseISO("2021-03-02T09:44:24.000Z"))
            .closed(parseISO("2021-03-02T09:44:24.000Z"))
            .build(),
          new MergeEventBuilderForPR("crm-pilates", 717283366)
            .createdAt(parseISO("2022-02-26T10:06:35.000Z"))
            .mergedAt(parseISO("2022-02-28T10:09:15.000Z"))
            .closed(parseISO("2022-02-28T10:09:15.000Z"))
            .build(),
        ];
        repository.persistAll(mergeEvents);

        const eventsByPeriod = (
          await gitStatistics({
            repo: "crm-pilates",
            owner: "any",
            fromDate: start,
            toDate: end,
          } as PullRequestsStatsParameter)
        ).mergedEventsStatistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;

        const monthsIn2021 = eventsByPeriod.get(2021)[0].Month;
        expect(monthsIn2021.flatMap((month) => month.index)).toStrictEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        const monthsIn2022 = eventsByPeriod.get(2022)[0].Month;
        expect(monthsIn2022.flatMap((month) => month.index)).toStrictEqual([0, 1, 2]);
      });

      describe("Average and median", () => {
        it("should have average duration per period", async () => {
          const start = parseISO("2021-03-01T00:00:00");
          const end = parseISO("2021-03-15T00:00:00");
          const firstMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-01T09:00:00.000Z"))
            .mergedAt(parseISO("2021-03-02T09:00:00.000Z"))
            .build();
          const secondMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-02T10:00:00.000Z"))
            .mergedAt(parseISO("2021-03-02T15:00:00.000Z"))
            .build();
          const thirdMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-06T11:00:00.000Z"))
            .mergedAt(parseISO("2021-03-06T13:00:00.000Z"))
            .build();
          const fourthMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-11T09:00:00.000Z"))
            .mergedAt(parseISO("2021-03-13T11:00:00.000Z"))
            .build();
          const fifthMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-13T09:00:00.000Z"))
            .mergedAt(parseISO("2021-03-13T12:00:00.000Z"))
            .build();
          const mergeEvents = [
            firstMergeRequest,
            secondMergeRequest,
            thirdMergeRequest,
            fourthMergeRequest,
            fifthMergeRequest,
          ];
          repository.persistAll(mergeEvents);

          const eventsByPeriod = (
            await gitStatistics({
              projectId: 3,
              fromDate: start,
              toDate: end,
            } as GitlabEventParameters)
          ).mergedEventsStatistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;

          const months = eventsByPeriod.get(2021)[0].Month;
          const expectedMonthAverageDuration: Duration = {
            days: 0,
            hours: 16,
            minutes: 48,
            months: 0,
            seconds: 0,
          };
          expect(months[0].average()).toStrictEqual(expectedMonthAverageDuration);
          const weeks = eventsByPeriod.get(2021)[1].Week;
          const expectedFirstWeekAverageDuration: Duration = {
            days: 0,
            hours: 10,
            minutes: 20,
            months: 0,
            seconds: 0,
          };
          expect(weeks[0].average()).toStrictEqual(expectedFirstWeekAverageDuration);
          const expectedSecondtWeekAverageDuration: Duration = {
            days: 1,
            hours: 2,
            minutes: 30,
            months: 0,
            seconds: 0,
          };
          expect(weeks[1].average()).toStrictEqual(expectedSecondtWeekAverageDuration);
        });

        it("should have average duration per period with empty period", async () => {
          const start = parseISO("2021-03-01T00:00:00");
          const end = parseISO("2021-03-15T00:00:00");
          const firstMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-01T09:00:00.000Z"))
            .mergedAt(parseISO("2021-03-02T09:00:00.000Z"))
            .build();
          const secondMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-02T10:00:00.000Z"))
            .mergedAt(parseISO("2021-03-02T15:00:00.000Z"))
            .build();
          const mergeEvents = [firstMergeRequest, secondMergeRequest];
          repository.persistAll(mergeEvents);

          const eventsByPeriod = (
            await gitStatistics({
              projectId: 3,
              fromDate: start,
              toDate: end,
            } as GitlabEventParameters)
          ).mergedEventsStatistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;

          const months = eventsByPeriod.get(2021)[0].Month;
          const expectedMonthAverageDuration: Duration = {
            days: 0,
            hours: 14,
            minutes: 30,
            months: 0,
            seconds: 0,
          };
          expect(months[0].average()).toStrictEqual(expectedMonthAverageDuration);
          const weeks = eventsByPeriod.get(2021)[1].Week;
          const expectedFirstWeekAverageDuration: Duration = {
            days: 0,
            hours: 14,
            minutes: 30,
            months: 0,
            seconds: 0,
          };
          expect(weeks[0].average()).toStrictEqual(expectedFirstWeekAverageDuration);
          expect(weeks[1].average()).toStrictEqual({ days: 0, hours: 0, minutes: 0, months: 0, seconds: 0 });
        });

        it("should have median duration per period", async () => {
          const start = parseISO("2021-03-01T00:00:00");
          const end = parseISO("2021-03-15T00:00:00");
          const firstMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-01T09:00:00.000Z"))
            .mergedAt(parseISO("2021-03-02T09:00:00.000Z"))
            .build();
          const secondMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-02T10:00:00.000Z"))
            .mergedAt(parseISO("2021-03-02T15:00:00.000Z"))
            .build();
          const thirdMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-06T11:00:00.000Z"))
            .mergedAt(parseISO("2021-03-06T13:00:00.000Z"))
            .build();
          const fourthMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-11T09:00:00.000Z"))
            .mergedAt(parseISO("2021-03-13T11:00:00.000Z"))
            .build();
          const fifthMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-13T09:00:00.000Z"))
            .mergedAt(parseISO("2021-03-13T12:00:00.000Z"))
            .build();
          const mergeEvents = [
            firstMergeRequest,
            secondMergeRequest,
            thirdMergeRequest,
            fourthMergeRequest,
            fifthMergeRequest,
          ];
          repository.persistAll(mergeEvents);

          const eventsByPeriod = (
            await gitStatistics({
              projectId: 3,
              fromDate: start,
              toDate: end,
            } as GitlabEventParameters)
          ).mergedEventsStatistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;

          const months = eventsByPeriod.get(2021)[0].Month;
          const expectedMonthMedianDuration: Duration = {
            days: 0,
            hours: 5,
            minutes: 0,
            months: 0,
            seconds: 0,
          };
          expect(months[0].median()).toStrictEqual(expectedMonthMedianDuration);
          const weeks = eventsByPeriod.get(2021)[1].Week;
          const expectedFirstWeekMedianDuration: Duration = {
            days: 0,
            hours: 5,
            minutes: 0,
            months: 0,
            seconds: 0,
          };
          expect(weeks[0].median()).toStrictEqual(expectedFirstWeekMedianDuration);
          const expectedSecondtWeekMedianDuration: Duration = {
            days: 1,
            hours: 2,
            minutes: 30,
            months: 0,
            seconds: 0,
          };
          expect(weeks[1].median()).toStrictEqual(expectedSecondtWeekMedianDuration);
        });

        it("should have median duration per period with empty period", async () => {
          const start = parseISO("2021-03-01T00:00:00");
          const end = parseISO("2021-03-15T00:00:00");
          const firstMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-01T09:00:00.000Z"))
            .mergedAt(parseISO("2021-03-02T09:00:00.000Z"))
            .build();
          const secondMergeRequest = new MergeEventBuilderForMR(3)
            .createdAt(parseISO("2021-03-02T10:00:00.000Z"))
            .mergedAt(parseISO("2021-03-02T15:00:00.000Z"))
            .build();
          const mergeEvents = [firstMergeRequest, secondMergeRequest];
          repository.persistAll(mergeEvents);

          const eventsByPeriod = (
            await gitStatistics({
              projectId: 3,
              fromDate: start,
              toDate: end,
            } as GitlabEventParameters)
          ).mergedEventsStatistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;

          const months = eventsByPeriod.get(2021)[0].Month;
          const expectedMonthAverageDuration: Duration = {
            days: 0,
            hours: 14,
            minutes: 30,
            months: 0,
            seconds: 0,
          };
          expect(months[0].average()).toStrictEqual(expectedMonthAverageDuration);
          const weeks = eventsByPeriod.get(2021)[1].Week;
          const expectedFirstWeekAverageDuration: Duration = {
            days: 0,
            hours: 14,
            minutes: 30,
            months: 0,
            seconds: 0,
          };
          expect(weeks[0].median()).toStrictEqual(expectedFirstWeekAverageDuration);
          expect(weeks[1].median()).toStrictEqual({ days: 0, hours: 0, minutes: 0, months: 0, seconds: 0 });
        });
      });
    });

    describe("Cumulative merge events statistics", () => {
      let repository: MergeRequestMemoryRepository;

      beforeEach(() => {
        new GitlabMemoryRepositories();
        repository = Repositories.mergeEvent() as MergeRequestMemoryRepository;
      });

      it("should have total cumulative merged events in period", async () => {
        const start = parseISO("2021-06-06T00:00:00Z");
        const end = parseISO("2021-06-26T23:59:59Z");
        const mergeEvents = new MergeEventsBuilderForMR(1)
          .inWeek(new WeekPeriodMergeEventsBuilder(24, 7, 6))
          .inWeek(new WeekPeriodMergeEventsBuilder(25, 4, 2))
          .inWeek(new WeekPeriodMergeEventsBuilder(26, 1, 1))
          .forPeriod(start, end)
          .build();
        repository.persistAll(mergeEvents);

        const eventsByPeriod = (
          await gitStatistics({
            projectId: 1,
            fromDate: start,
            toDate: end,
          } as GitlabEventParameters)
        ).cumulativeStatistics.result<Map<Unit, CumulativeStatistic[]>>().results;

        const months = eventsByPeriod.get("Month");
        expect(months[0].opened).toBeGreaterThanOrEqual(12);
        expect(months[0].closed).toBe(9);
        const weeks = eventsByPeriod.get("Week");
        expect(weeks[0].opened).toBeGreaterThanOrEqual(7);
        expect(weeks[0].closed).toBe(6);
        expect(weeks[1].opened).toBeGreaterThanOrEqual(11);
        expect(weeks[1].closed).toBe(8);
        expect(weeks[2].opened).toBeGreaterThanOrEqual(12);
        expect(weeks[2].closed).toBe(9);
      });

      it("should have total cumulative merged events in period greater than 1 month", async () => {
        const start = parseISO("2021-06-06T00:00:00Z");
        const end = parseISO("2021-07-26T00:00:00Z");
        const mergeEvents = new MergeEventsBuilderForMR(1)
          .inWeek(new WeekPeriodMergeEventsBuilder(24, 5, 2))
          .inWeek(new WeekPeriodMergeEventsBuilder(25, 7, 6))
          .inWeek(new WeekPeriodMergeEventsBuilder(26, 4, 2))
          .inWeek(new WeekPeriodMergeEventsBuilder(27, 0, 0))
          .inWeek(new WeekPeriodMergeEventsBuilder(28, 0, 0))
          .inWeek(new WeekPeriodMergeEventsBuilder(29, 5, 3))
          .inWeek(new WeekPeriodMergeEventsBuilder(30, 4, 6))
          .inWeek(new WeekPeriodMergeEventsBuilder(31, 3, 1))
          .forPeriod(start, end)
          .build();
        repository.persistAll(mergeEvents);

        const eventsByPeriod = (
          await gitStatistics({
            projectId: 1,
            fromDate: start,
            toDate: end,
          } as GitlabEventParameters)
        ).cumulativeStatistics.result<Map<Unit, CumulativeStatistic[]>>().results;

        const months = eventsByPeriod.get("Month");
        expect(months[0].opened).toBeGreaterThanOrEqual(16);
        expect(months[0].closed).toBe(10);
        expect(months[1].opened).toBeGreaterThanOrEqual(28);
        expect(months[1].closed).toBe(20);
        const weeks = eventsByPeriod.get("Week");
        expect(weeks[0].opened).toBeGreaterThanOrEqual(5);
        expect(weeks[0].closed).toBe(2);
        expect(weeks[7].opened).toBeGreaterThanOrEqual(28);
        expect(weeks[7].closed).toBe(20);
      });

      it("should have total cumulative merged events for overlapping years", async () => {
        const start = parseISO("2021-01-01T00:00:00");
        const end = parseISO("2022-03-31T00:00:00");
        const mergeEvents = new MergeEventsBuilderForMR(1)
          .inWeek(new WeekPeriodMergeEventsBuilder(2, 5, 2))
          .inWeek(new WeekPeriodMergeEventsBuilder(3, 7, 6))
          .inWeek(new WeekPeriodMergeEventsBuilder(12, 4, 3))
          .inWeek(new WeekPeriodMergeEventsBuilder(51, 4, 2))
          .inWeek(new WeekPeriodMergeEventsBuilder(52, 0, 0))
          .forPeriod(start, end)
          .build();
        repository.persistAll(mergeEvents);

        const eventsByPeriod = (
          await gitStatistics({
            projectId: 1,
            fromDate: start,
            toDate: end,
          } as GitlabEventParameters)
        ).cumulativeStatistics.result<Map<Unit, CumulativeStatistic[]>>().results;

        const months = eventsByPeriod.get("Month");
        expect(months[0].opened).toBe(20);
        expect(months[0].closed).toBe(8);
        expect(months[11].opened).toBe(33);
        expect(months[11].closed).toBe(13);
        expect(months[12].opened).toBe(53);
        expect(months[12].closed).toBe(21);
        const weeks = eventsByPeriod.get("Week");
        expect(weeks[1].opened).toBeGreaterThanOrEqual(5);
        expect(weeks[1].closed).toBe(2);
        expect(weeks[2].opened).toBeGreaterThanOrEqual(12);
        expect(weeks[2].closed).toBe(8);
        expect(weeks[52].opened).toBeGreaterThanOrEqual(25);
        expect(weeks[52].closed).toBe(13);
      });

      describe("Trend calculator", () => {
        it("should calculate trend", () => {
          const firstCumulative = new CumulativeStatisticBuilder().atIndex(0).opened(3).closed(3).build();
          const secondCumulative = new CumulativeStatisticBuilder().atIndex(1).opened(5).closed(5).build();
          const thirdCumulative = new CumulativeStatisticBuilder().atIndex(2).opened(6.5).closed(6.5).build();

          TrendCalculator.calculate([firstCumulative, secondCumulative, thirdCumulative]);

          expect(firstCumulative.trend).toBe(1.75 + 1.3);
          expect(secondCumulative.trend).toBe(1.75 * 2 + 1.3);
          expect(thirdCumulative.trend).toBe(1.75 * 3 + 1.3);
        });

        it("should calculate trend even if one element in the series", () => {
          const firstCumulative = new CumulativeStatisticBuilder().atIndex(0).opened(3).closed(3).build();

          TrendCalculator.calculate([firstCumulative]);

          expect(firstCumulative.trend).toBe(3);
        });
      });
    });
  });

  describe("Issues", () => {
    describe("Aggregated Statistics", () => {
      beforeEach(() => {
        new GitlabMemoryRepositories();
      });

      it("should have aggregate issues statistics", async () => {
        const repository: IssueEventsMemoryRepository = Repositories.issueEvent() as IssueEventsMemoryRepository;
        const firstIssue = new IssueEventBuilder(1).createdAt(parseISO("2022-05-01T10:52:00")).build();
        const secondIssue = new IssueEventBuilder(1).createdAt(parseISO("2022-05-11T13:32:00")).build();
        const thirdIssue = new IssueEventBuilder(1).createdAt(parseISO("2022-05-13T15:25:00")).build();
        const fourthIssue = new IssueEventBuilder(1).createdAt(parseISO("2022-05-21T09:18:00")).build();
        const fifthIssue = new IssueEventBuilder(1)
          .createdAt(parseISO("2022-05-21T11:28:00"))
          .closedAt(parseISO("2022-05-21T15:58:00"))
          .build();
        repository.persistAll([firstIssue, secondIssue, thirdIssue, fourthIssue, fifthIssue]);

        const statistics = (
          await gitStatistics({
            projectId: 1,
            fromDate: parseISO("2022-05-01T00:00:00"),
            toDate: parseISO("2022-05-31T23:59:59"),
          } as RequestParameters)
        ).issues.result();

        expect(statistics.results).toEqual({
          average: { months: 0, days: 0, hours: 4, minutes: 30, seconds: 0 },
          total: { all: 5, closed: 1, opened: 4 },
        });
      });
    });

    describe("Cumulative statistics", () => {
      beforeEach(() => {
        new GitlabMemoryRepositories();
      });

      it("should generate cumulative statistics for issues", async () => {
        const repository = Repositories.issueEvent() as IssueEventsMemoryRepository;
        const start = parseISO("2021-06-06T00:00:00Z");
        const end = parseISO("2021-06-26T23:59:59Z");
        const issueEvents = new IssueEventsBuilder(1)
          .inWeek(new WeekPeriodIssueEventsBuilder(24, 7, 6))
          .inWeek(new WeekPeriodIssueEventsBuilder(25, 4, 2))
          .inWeek(new WeekPeriodIssueEventsBuilder(26, 1, 1))
          .forPeriod(start, end)
          .build();
        repository.persistAll(issueEvents);

        const cumulativeIssues = (
          await gitStatistics({
            projectId: 1,
            fromDate: start,
            toDate: end,
          } as RequestParameters)
        ).cumulativeIssues.result<Map<Unit, CumulativeStatistic[]>>().results;

        const months = cumulativeIssues.get("Month");
        expect(months[0].opened).toBeGreaterThanOrEqual(12);
        expect(months[0].closed).toBe(9);
        const weeks = cumulativeIssues.get("Week");
        expect(weeks[0].opened).toBeGreaterThanOrEqual(7);
        expect(weeks[0].closed).toBe(6);
        expect(weeks[1].opened).toBeGreaterThanOrEqual(11);
        expect(weeks[1].closed).toBe(8);
        expect(weeks[2].opened).toBeGreaterThanOrEqual(12);
        expect(weeks[2].closed).toBe(9);
      });
    });
  });
});
