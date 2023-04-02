import { compareAsc, compareDesc, parseISO } from "date-fns";
import {
  MergeEvents,
  MergeEventRepository,
  mergeEventsByPeriod,
  mergeEventsStatistics,
  GitStatistics,
} from "./MergeEvents";
import { Repository } from "../Repository";
import { MergeRequestBuilder, MergeRequestsBuilder } from "../__tests__/builder";
import { MergeRequestsStatsParameters } from "./Gitlab";

describe("Merge events statistics", () => {
  describe("Aggregated statistics", () => {
    it("should have merge events average", async () => {
      const repository: MergeEventRepository = new MergeRequestMemoryRepository();
      repository.persist(
        new MergeRequestBuilder(1)
          .createdAt(parseISO("2022-02-11T00:00:00"))
          .mergedAt(parseISO("2022-02-14T00:00:00"))
          .build()
      );
      repository.persist(
        new MergeRequestBuilder(1)
          .createdAt(parseISO("2022-02-18T00:00:00"))
          .mergedAt(parseISO("2022-02-20T00:00:00"))
          .build()
      );
      repository.persist(
        new MergeRequestBuilder(1)
          .createdAt(parseISO("2022-02-19T00:00:00"))
          .mergedAt(parseISO("2022-02-23T00:00:00"))
          .build()
      );
      repository.persist(
        new MergeRequestBuilder(2)
          .createdAt(parseISO("2022-02-13T00:00:00"))
          .mergedAt(parseISO("2022-02-15T00:00:00"))
          .build()
      );

      const stats: GitStatistics = await mergeEventsStatistics(
        {
          projectId: 1,
          fromDate: parseISO("2022-02-11T00:00:00"),
          toDate: parseISO("2022-02-25T00:00:00"),
        } as MergeRequestsStatsParameters,
        repository
      );

      expect(stats.result()).toEqual({
        average: { days: 3, hours: 72 },
        total: { all: 3, merged: 3, closed: 0, opened: 0 },
      });
    });

    it("should have merge events average when merge request is not merged yet", async () => {
      const repository: MergeEventRepository = new MergeRequestMemoryRepository();
      repository.persist(
        new MergeRequestBuilder(1)
          .createdAt(parseISO("2022-05-11T12:35:37"))
          .mergedAt(parseISO("2022-05-12T13:40:22"))
          .build()
      );
      repository.persist(new MergeRequestBuilder(1).createdAt(parseISO("2022-05-13T14:54:12")).notYetMerged().build());

      const stats: GitStatistics = await mergeEventsStatistics(
        {
          projectId: 1,
          fromDate: parseISO("2022-05-08T00:00:00"),
          toDate: parseISO("2022-05-15T00:00:00"),
        } as MergeRequestsStatsParameters,
        repository
      );

      expect(stats.result()).toEqual({
        average: { days: 1.04, hours: 25 },
        total: { all: 2, merged: 1, closed: 0, opened: 1 },
      });
    });

    it("should have merge events average with closed merge requests", async () => {
      const repository: MergeEventRepository = new MergeRequestMemoryRepository();
      repository.persist(
        new MergeRequestBuilder(1)
          .createdAt(parseISO("2022-05-11T12:35:37"))
          .mergedAt(parseISO("2022-05-12T13:40:22"))
          .build()
      );
      repository.persist(
        new MergeRequestBuilder(1)
          .createdAt(parseISO("2022-05-13T14:54:12"))
          .closed(parseISO("2022-05-14T14:54:12"))
          .build()
      );

      const stats: GitStatistics = await mergeEventsStatistics(
        {
          projectId: 1,
          fromDate: parseISO("2022-05-08T00:00:00"),
          toDate: parseISO("2022-05-15T00:00:00"),
        } as MergeRequestsStatsParameters,
        repository
      );

      expect(stats.result()).toEqual({
        average: { days: 1.04, hours: 25 },
        total: { all: 2, merged: 1, closed: 1, opened: 0 },
      });
    });
  });

  describe("Statistics by period", () => {
    it("should sort by weeks", () => {
      const start = parseISO("2022-02-01T00:00:00");
      const end = parseISO("2022-02-28T00:00:00");
      const mergeRequests = new MergeRequestsBuilder(1).total(20).forPeriod(start, end).withEmptyPeriod(7).build();

      const eventsByPeriod = mergeEventsByPeriod(
        new GitStatistics(mergeRequests, {
          start,
          end,
        })
      );

      expect(eventsByPeriod.map((stat) => stat.index)).toStrictEqual([6, 7, 8, 9, 10]);
      expect(eventsByPeriod[1].mr).toEqual(0);
    });

    it("should sort by weeks with all expected weeks", () => {
      const start = parseISO("2023-01-01T00:00:00");
      const end = parseISO("2023-02-10T00:00:00");
      const mergeRequests = new MergeRequestsBuilder(1).total(78).forPeriod(start, end).build();

      const eventsByPeriod = mergeEventsByPeriod(
        new GitStatistics(mergeRequests, {
          start,
          end,
        })
      );

      expect(eventsByPeriod.map((stat) => stat.index)).toStrictEqual([1, 2, 3, 4, 5, 6]);
      expect(eventsByPeriod.map((stat) => stat.unit)).toStrictEqual(Array(6).fill("Week"));
    });

    it("should move to month period when duration between 2 dates are over 2 months", () => {
      const start = parseISO("2023-01-01T00:00:00");
      const end = parseISO("2023-03-24T00:00:00");
      const mergeRequests = new MergeRequestsBuilder(1).total(78).forPeriod(start, end).build();

      const eventsByPeriod = mergeEventsByPeriod(
        new GitStatistics(mergeRequests, {
          start,
          end,
        })
      );

      expect(eventsByPeriod.map((stat) => stat.index)).toStrictEqual([0, 1, 2]);
      expect(eventsByPeriod.map((stat) => stat.unit)).toStrictEqual(Array(3).fill("Month"));
    });

    it("should sort period for months according to year overlap", () => {
      const start = parseISO("2022-10-01T00:00:00");
      const end = parseISO("2023-03-28T00:00:00");
      const mergeRequests = new MergeRequestsBuilder(1).total(120).forPeriod(start, end).randomlyNotMerged().build();

      const eventsByPeriod = mergeEventsByPeriod(
        new GitStatistics(mergeRequests, {
          start,
          end,
        })
      );

      expect(eventsByPeriod.map((stat) => stat.index)).toStrictEqual([9, 10, 11, 0, 1, 2]);
      expect(eventsByPeriod.map((stat) => stat.unit)).toStrictEqual(Array(6).fill("Month"));
    });

    it("should fill empty periods", () => {
      const start = parseISO("2020-01-01T00:00:00");
      const end = parseISO("2020-12-31T00:00:00");
      const mergeRequests = [
        new MergeRequestBuilder(1)
          .createdAt(parseISO("2020-03-01T00:00:00"))
          .mergedAt(parseISO("2020-03-12T00:00:00"))
          .build(),
        new MergeRequestBuilder(1)
          .createdAt(parseISO("2020-06-08T00:00:00"))
          .mergedAt(parseISO("2020-06-09T00:00:00"))
          .build(),
        new MergeRequestBuilder(1)
          .createdAt(parseISO("2020-08-12T00:00:00"))
          .mergedAt(parseISO("2020-08-14T00:00:00"))
          .build(),
      ];

      const eventsByPeriod = mergeEventsByPeriod(
        new GitStatistics(mergeRequests, {
          start,
          end,
        })
      );

      expect(eventsByPeriod.map((stat) => stat.index)).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      expect(eventsByPeriod.map((stat) => stat.mr)).toStrictEqual([0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0]);
      expect(eventsByPeriod.map((stat) => stat.unit)).toStrictEqual(Array(12).fill("Month"));
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
          projectId: 1,
        },
        {
          closedAt: parseISO("2021-08-22T10:09:15.000Z"),
          createdAt: parseISO("2021-08-22T10:06:35.000Z"),
          id: 717283366,
          mergedAt: parseISO("2021-08-22T10:09:15.000Z"),
          projectId: 1,
        },
      ];

      const eventsByPeriod = mergeRequestsByPeriod(
        new MergeRequestStats(mergeRequests, {
          start,
          end,
        })
      );

      expect(eventsByPeriod.map((stat) => stat.index)).toStrictEqual([32, 33, 34, 35, 36]);
      expect(eventsByPeriod.map((stat) => stat.mr)).toStrictEqual([1, 0, 0, 1, 0]);
      expect(eventsByPeriod.map((stat) => stat.unit)).toStrictEqual(Array(5).fill("Week"));
    });
  });
});

abstract class MemoryRepository<T> implements Repository<T> {
  protected entities: T[] = [];

  persist(entity: T) {
    this.entities.push(entity);
  }
}

class MergeRequestMemoryRepository extends MemoryRepository<MergeEvents> implements MergeEventRepository {
  getMergeEventsForPeriod = (requestParameters: MergeRequestsStatsParameters): Promise<MergeEvents[]> => {
    const mergeRequests = this.entities.filter(
      (mergeRequest) =>
        mergeRequest.project == requestParameters.projectId &&
        compareAsc(mergeRequest.createdAt, requestParameters.fromDate) >= 0 &&
        compareDesc(mergeRequest.createdAt, requestParameters.toDate) >= 0
    );
    return Promise.all(mergeRequests);
  };
}
