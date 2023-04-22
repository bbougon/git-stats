import { compareAsc, compareDesc, parseISO } from "date-fns";
import { MergeEventStatistics, MergeEvent, MergeEventRepository } from "./merge-events/MergeEvent.js";
import {
  MergeEventBuilderForMR,
  MergeEventsBuilderForMR,
  RandomInPeriodMergeEventsBuilder,
  WeekPeriodMergeEventsBuilder,
} from "../__tests__/builder.js";
import {
  mergedEventsStatisticByPeriod,
  gitStatistics,
  cumulativeMergeEventsStatisticByPeriod,
} from "./GitStatistics.js";
import { MergeRequestsStatsParameters } from "./Gitlab.js";
import { Repository } from "../Repository.js";
import Duration from "./Duration.js";

describe("Git Statistics", () => {
  function getEventDate() {
    return (mr: MergeEvent) => ({ end: mr.mergedAt, start: mr.createdAt });
  }

  describe("Merge events", () => {
    describe("Aggregated statistics", () => {
      it("should have merge events average", async () => {
        const repository: MergeEventRepository = new MergeRequestMemoryRepository();
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
          await gitStatistics(
            {
              projectId: 1,
              fromDate: parseISO("2022-02-11T00:00:00"),
              toDate: parseISO("2022-02-25T00:00:00"),
            } as MergeRequestsStatsParameters,
            repository
          )
        ).mergedEvents;

        expect(stats.result()).toEqual({
          average: { months: 0, days: 3, hours: 0, minutes: 0, seconds: 0 },
          total: { all: 3, merged: 3, closed: 0, opened: 0 },
        });
      });

      it("should have merge events average when merge request is not merged yet", async () => {
        const repository: MergeEventRepository = new MergeRequestMemoryRepository();
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
          await gitStatistics(
            {
              projectId: 1,
              fromDate: parseISO("2022-05-08T00:00:00"),
              toDate: parseISO("2022-05-15T00:00:00"),
            } as MergeRequestsStatsParameters,
            repository
          )
        ).mergedEvents;

        expect(stats.result()).toEqual({
          average: { months: 0, days: 1, hours: 1, minutes: 0, seconds: 0 },
          total: { all: 2, merged: 1, closed: 0, opened: 1 },
        });
      });

      it("should have merge events average with closed merge requests", async () => {
        const repository: MergeEventRepository = new MergeRequestMemoryRepository();
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
          await gitStatistics(
            {
              projectId: 1,
              fromDate: parseISO("2022-05-08T00:00:00"),
              toDate: parseISO("2022-05-15T00:00:00"),
            } as MergeRequestsStatsParameters,
            repository
          )
        ).mergedEvents;

        expect(stats.result()).toEqual({
          average: { months: 0, days: 1, hours: 1, minutes: 0, seconds: 0 },
          total: { all: 2, merged: 1, closed: 1, opened: 0 },
        });
      });

      it("should have merge events average for duration greater than a month", async () => {
        const repository: MergeEventRepository = new MergeRequestMemoryRepository();
        repository.persist(
          new MergeEventBuilderForMR(1)
            .createdAt(parseISO("2022-01-10T12:34:25"))
            .mergedAt(parseISO("2022-02-14T17:22:54"))
            .build()
        );

        const stats = (
          await gitStatistics(
            {
              projectId: 1,
              fromDate: parseISO("2022-01-01T00:00:00"),
              toDate: parseISO("2022-02-25T00:00:00"),
            } as MergeRequestsStatsParameters,
            repository
          )
        ).mergedEvents;

        expect(stats.result()).toEqual({
          average: { months: 1, days: 4, hours: 4, minutes: 0, seconds: 0 },
          total: { all: 1, merged: 1, closed: 0, opened: 0 },
        });
      });
    });

    describe("Merged Events Statistics by period", () => {
      it("should sort the periods", () => {
        const start = parseISO("2022-02-01T00:00:00");
        const end = parseISO("2022-02-28T00:00:00");
        const mergeRequests = new MergeEventsBuilderForMR(1)
          .randomly(new RandomInPeriodMergeEventsBuilder(20, 7))
          .forPeriod(start, end)
          .build();

        const eventsByPeriod = mergedEventsStatisticByPeriod(
          new MergeEventStatistics(mergeRequests, {
            start,
            end,
          }),
          getEventDate()
        );

        const month = eventsByPeriod.get(2022)[0].Month[0];
        expect(month.index).toEqual(1);
        expect(month.events).toHaveLength(mergeRequests.length);
        const weeks = eventsByPeriod.get(2022)[1].Week;
        expect(weeks.flatMap((week) => week.index)).toStrictEqual([6, 7, 8, 9, 10]);
        expect(weeks[1].total()).toEqual(0);
      });

      it("should sort by period unit with all expected period units", () => {
        const start = parseISO("2023-01-01T00:00:00");
        const end = parseISO("2023-02-10T00:00:00");
        const mergeRequests = new MergeEventsBuilderForMR(1)
          .randomly(new RandomInPeriodMergeEventsBuilder(78))
          .forPeriod(start, end)
          .build();

        const eventsByPeriod = mergedEventsStatisticByPeriod(
          new MergeEventStatistics(mergeRequests, {
            start,
            end,
          }),
          getEventDate()
        );

        const months = eventsByPeriod.get(2023)[0].Month;
        expect(months.flatMap((month) => month.index)).toStrictEqual([0, 1]);
        const weeks = eventsByPeriod.get(2023)[1].Week;
        expect(weeks.flatMap((week) => week.index)).toStrictEqual([1, 2, 3, 4, 5, 6]);
      });

      it("should sort period when year overlaps", () => {
        const start = parseISO("2022-10-01T00:00:00");
        const end = parseISO("2023-03-28T00:00:00");
        const mergeRequests = new MergeEventsBuilderForMR(1)
          .randomly(new RandomInPeriodMergeEventsBuilder(120, 0, true))
          .forPeriod(start, end)
          .build();

        const eventsByPeriod = mergedEventsStatisticByPeriod(
          new MergeEventStatistics(mergeRequests, {
            start,
            end,
          }),
          getEventDate()
        );

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

      it("should fill empty periods", () => {
        const start = parseISO("2020-01-01T00:00:00");
        const end = parseISO("2020-12-31T00:00:00");
        const mergeRequests = [
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

        const eventsByPeriod = mergedEventsStatisticByPeriod(
          new MergeEventStatistics(mergeRequests, {
            start,
            end,
          }),
          getEventDate()
        );

        const monthsIn2020 = eventsByPeriod.get(2020)[0].Month;
        expect(monthsIn2020.flatMap((month) => month.index)).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      });

      it("should fill empty periods in the middle of a year", () => {
        const start = parseISO("2021-08-01T00:00:00");
        const end = parseISO("2021-08-31T00:00:00");
        const mergeRequests = [
          {
            closedAt: parseISO("2021-08-03T09:44:24.000Z"),
            createdAt: parseISO("2021-08-03T09:44:16.000Z"),
            id: 702124235,
            mergedAt: parseISO("2021-08-03T09:44:24.000Z"),
            project: "crm-pilates",
          },
          {
            closedAt: parseISO("2021-08-22T10:09:15.000Z"),
            createdAt: parseISO("2021-08-22T10:06:35.000Z"),
            id: 717283366,
            mergedAt: parseISO("2021-08-22T10:09:15.000Z"),
            project: "crm-pilates",
          },
        ];

        const eventsByPeriod = mergedEventsStatisticByPeriod(
          new MergeEventStatistics(mergeRequests, {
            start,
            end,
          }),
          getEventDate()
        );

        const months = eventsByPeriod.get(2021)[0].Month;
        expect(months.flatMap((month) => month.index)).toStrictEqual([7]);
        const weeks = eventsByPeriod.get(2021)[1].Week;
        expect(weeks.flatMap((month) => month.index)).toStrictEqual([32, 33, 34, 35, 36]);
      });

      it("should create all periods if it does exactly one year", () => {
        const start = parseISO("2021-03-01T00:00:00");
        const end = parseISO("2022-03-02T00:00:00");
        const mergeRequests = [
          {
            closedAt: parseISO("2021-03-02T09:44:24.000Z"),
            createdAt: parseISO("2021-03-01T09:44:16.000Z"),
            id: 702124235,
            mergedAt: parseISO("2021-03-02T09:44:24.000Z"),
            project: "crm-pilates",
          },
          {
            closedAt: parseISO("2022-02-28T10:09:15.000Z"),
            createdAt: parseISO("2022-02-26T10:06:35.000Z"),
            id: 717283366,
            mergedAt: parseISO("2022-02-28T10:09:15.000Z"),
            project: "crm-pilates",
          },
        ];

        const eventsByPeriod = mergedEventsStatisticByPeriod(
          new MergeEventStatistics(mergeRequests, {
            start,
            end,
          }),
          getEventDate()
        );

        const monthsIn2021 = eventsByPeriod.get(2021)[0].Month;
        expect(monthsIn2021.flatMap((month) => month.index)).toStrictEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        const monthsIn2022 = eventsByPeriod.get(2022)[0].Month;
        expect(monthsIn2022.flatMap((month) => month.index)).toStrictEqual([0, 1, 2]);
      });

      describe("Average and median", () => {
        it("should have average duration per period", () => {
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
          const mergeRequests = [
            firstMergeRequest,
            secondMergeRequest,
            thirdMergeRequest,
            fourthMergeRequest,
            fifthMergeRequest,
          ];

          const eventsByPeriod = mergedEventsStatisticByPeriod(
            new MergeEventStatistics(mergeRequests, {
              start,
              end,
            }),
            getEventDate()
          );

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

        it("should have average duration per period with empty period", () => {
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
          const mergeRequests = [firstMergeRequest, secondMergeRequest];

          const eventsByPeriod = mergedEventsStatisticByPeriod(
            new MergeEventStatistics(mergeRequests, {
              start,
              end,
            }),
            getEventDate()
          );

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

        it("should have median duration per period", () => {
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
          const mergeRequests = [
            firstMergeRequest,
            secondMergeRequest,
            thirdMergeRequest,
            fourthMergeRequest,
            fifthMergeRequest,
          ];

          const eventsByPeriod = mergedEventsStatisticByPeriod(
            new MergeEventStatistics(mergeRequests, {
              start,
              end,
            }),
            getEventDate()
          );

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

        it("should have median duration per period with empty period", () => {
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
          const mergeRequests = [firstMergeRequest, secondMergeRequest];

          const eventsByPeriod = mergedEventsStatisticByPeriod(
            new MergeEventStatistics(mergeRequests, {
              start,
              end,
            }),
            getEventDate()
          );

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
      it("should have total cumulative merged events in period", () => {
        const start = parseISO("2021-06-07T00:00:00");
        const end = parseISO("2021-06-26T00:00:00");
        const mergeRequests = new MergeEventsBuilderForMR(1)
          .inWeek(new WeekPeriodMergeEventsBuilder(24, 7, 6))
          .inWeek(new WeekPeriodMergeEventsBuilder(25, 4, 2))
          .inWeek(new WeekPeriodMergeEventsBuilder(26, 1, 1))
          .forPeriod(start, end)
          .build();

        const eventsByPeriod = cumulativeMergeEventsStatisticByPeriod(
          new MergeEventStatistics(mergeRequests, {
            start,
            end,
          }),
          (mr: MergeEvent) => ({ end: mr.mergedAt || mr.closedAt, start: mr.createdAt })
        );

        const months = eventsByPeriod.get("Month");
        expect(months[0].opened).toBeGreaterThanOrEqual(12);
        expect(months[0].closed).toBe(9);
        const weeks = eventsByPeriod.get("Week");
        expect(weeks[0].opened).toBeGreaterThanOrEqual(7);
        expect(weeks[0].closed).toBe(6);
        expect(weeks[0].trend).toBe(7);
        expect(weeks[1].opened).toBeGreaterThanOrEqual(11);
        expect(weeks[1].closed).toBe(8);
        expect(weeks[1].trend).toBe(14);
        expect(weeks[2].opened).toBeGreaterThanOrEqual(12);
        expect(weeks[2].closed).toBe(9);
        expect(weeks[2].trend).toBe(21);
      });

      it("should have total cumulative merged events in period greater than 1 month", () => {
        const start = parseISO("2021-06-01T00:00:00");
        const end = parseISO("2021-07-26T00:00:00");
        const mergeRequests = new MergeEventsBuilderForMR(1)
          .inWeek(new WeekPeriodMergeEventsBuilder(23, 5, 2))
          .inWeek(new WeekPeriodMergeEventsBuilder(24, 7, 6))
          .inWeek(new WeekPeriodMergeEventsBuilder(25, 4, 2))
          .inWeek(new WeekPeriodMergeEventsBuilder(26, 0, 0))
          .inWeek(new WeekPeriodMergeEventsBuilder(27, 0, 0))
          .inWeek(new WeekPeriodMergeEventsBuilder(28, 5, 3))
          .inWeek(new WeekPeriodMergeEventsBuilder(29, 4, 6))
          .inWeek(new WeekPeriodMergeEventsBuilder(30, 3, 1))
          .forPeriod(start, end)
          .build();

        const eventsByPeriod = cumulativeMergeEventsStatisticByPeriod(
          new MergeEventStatistics(mergeRequests, {
            start,
            end,
          }),
          (mr: MergeEvent) => ({ end: mr.mergedAt || mr.closedAt, start: mr.createdAt })
        );

        const months = eventsByPeriod.get("Month");
        expect(months[0].opened).toBeGreaterThanOrEqual(16);
        expect(months[0].closed).toBe(10);
        expect(months[0].trend).toBe(24);
        expect(months[1].opened).toBeGreaterThanOrEqual(28);
        expect(months[1].closed).toBe(20);
        expect(months[1].trend).toBe(48);
        const weeks = eventsByPeriod.get("Week");
        expect(weeks[0].opened).toBeGreaterThanOrEqual(5);
        expect(weeks[0].closed).toBe(2);
        expect(weeks[0].trend).toBeCloseTo(5.33, 2);
        expect(weeks[7].opened).toBeGreaterThanOrEqual(28);
        expect(weeks[7].closed).toBe(20);
        expect(weeks[8].trend).toBe(48);
      });

      it("should have total cumulative merged events for overlapping years", async () => {
        const start = parseISO("2021-01-01T00:00:00");
        const end = parseISO("2022-03-31T00:00:00");
        const mergeRequests = new MergeEventsBuilderForMR(1)
          .inWeek(new WeekPeriodMergeEventsBuilder(2, 5, 2))
          .inWeek(new WeekPeriodMergeEventsBuilder(3, 7, 6))
          .inWeek(new WeekPeriodMergeEventsBuilder(12, 4, 3))
          .inWeek(new WeekPeriodMergeEventsBuilder(51, 4, 2))
          .inWeek(new WeekPeriodMergeEventsBuilder(52, 0, 0))
          .forPeriod(start, end)
          .build();

        const eventsByPeriod = cumulativeMergeEventsStatisticByPeriod(
          new MergeEventStatistics(mergeRequests, {
            start,
            end,
          }),
          (mr: MergeEvent) => ({ end: mr.mergedAt || mr.closedAt, start: mr.createdAt })
        );

        const months = eventsByPeriod.get("Month");
        expect(months[0].opened).toBe(12);
        expect(months[0].closed).toBe(8);
        expect(months[0].trend).toBe(4);
        expect(months[12].opened).toBeGreaterThanOrEqual(32);
        expect(months[12].closed).toBe(21);
        expect(months[12].trend).toBe(52);
        const weeks = eventsByPeriod.get("Week");
        expect(weeks[1].opened).toBeGreaterThanOrEqual(5);
        expect(weeks[1].closed).toBe(2);
        expect(weeks[1].trend).toBeCloseTo(1.8181, 2);
        expect(weeks[2].opened).toBeGreaterThanOrEqual(12);
        expect(weeks[2].closed).toBe(8);
        expect(weeks[2].trend).toBeCloseTo(2.7272, 2);
        expect(weeks[52].opened).toBeGreaterThanOrEqual(25);
        expect(weeks[52].closed).toBe(13);
        expect(weeks[52].trend).toBeCloseTo(48.1818, 2);
      });
    });
  });
});

abstract class MemoryRepository<T> implements Repository<T> {
  protected entities: T[] = [];

  persist(entity: T) {
    this.entities.push(entity);
  }
}

class MergeRequestMemoryRepository extends MemoryRepository<MergeEvent> implements MergeEventRepository {
  getMergeEventsForPeriod = (requestParameters: MergeRequestsStatsParameters): Promise<MergeEvent[]> => {
    const mergeRequests = this.entities.filter(
      (mergeRequest) =>
        mergeRequest.project == requestParameters.projectId &&
        compareAsc(mergeRequest.createdAt, requestParameters.fromDate) >= 0 &&
        compareDesc(mergeRequest.createdAt, requestParameters.toDate) >= 0
    );
    return Promise.all(mergeRequests);
  };
}
