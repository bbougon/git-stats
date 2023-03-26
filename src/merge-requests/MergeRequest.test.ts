import { compareAsc, compareDesc, parseISO } from "date-fns";
import {
  MergeRequest,
  MergeRequestRepository,
  mergeRequestsByPeriod,
  mergeRequestsStats,
  MergeRequestStats,
} from "./MergeRequest";
import { Repository } from "../Repository";
import { MergeRequestBuilder, MergeRequestsBuilder } from "../__tests__/builder";

describe("Merge requests statistics", () => {
  describe("Aggregated statistics", () => {
    it("should have merge requests average", async () => {
      const repository: MergeRequestRepository = new MergeRequestMemoryRepository();
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

      const stats: MergeRequestStats = await mergeRequestsStats(
        {
          projectId: 1,
          fromDate: parseISO("2022-02-11T00:00:00"),
          toDate: parseISO("2022-02-25T00:00:00"),
        },
        repository
      );

      expect(stats.result()).toEqual({
        average: { days: 3, hours: 72 },
        total: { all: 3, merged: 3, closed: 0, opened: 0 },
      });
    });

    it("should have merge request average when merge request is not merged yet", async () => {
      const repository: MergeRequestRepository = new MergeRequestMemoryRepository();
      repository.persist(
        new MergeRequestBuilder(1)
          .createdAt(parseISO("2022-05-11T12:35:37"))
          .mergedAt(parseISO("2022-05-12T13:40:22"))
          .build()
      );
      repository.persist(new MergeRequestBuilder(1).createdAt(parseISO("2022-05-13T14:54:12")).notYetMerged().build());

      const stats: MergeRequestStats = await mergeRequestsStats(
        {
          projectId: 1,
          fromDate: parseISO("2022-05-08T00:00:00"),
          toDate: parseISO("2022-05-15T00:00:00"),
        },
        repository
      );

      expect(stats.result()).toEqual({
        average: { days: 1.04, hours: 25 },
        total: { all: 2, merged: 1, closed: 0, opened: 1 },
      });
    });

    it("should have merge request average with closed merge requests", async () => {
      const repository: MergeRequestRepository = new MergeRequestMemoryRepository();
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

      const stats: MergeRequestStats = await mergeRequestsStats(
        {
          projectId: 1,
          fromDate: parseISO("2022-05-08T00:00:00"),
          toDate: parseISO("2022-05-15T00:00:00"),
        },
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
      const mergeRequests = new MergeRequestsBuilder(1)
        .total(20)
        .forPeriod(parseISO("2022-02-01T00:00:00"), parseISO("2022-02-28T00:00:00"))
        .withEmptyPeriod(7)
        .build();

      const requestsByPeriod = mergeRequestsByPeriod(new MergeRequestStats(mergeRequests));

      expect(requestsByPeriod.map((stat) => stat.index)).toStrictEqual([6, 7, 8, 9, 10]);
      expect(requestsByPeriod[1].mr).toEqual(0);
    });

    it("should sort by weeks with all expected weeks", () => {
      const mergeRequests = new MergeRequestsBuilder(1)
        .total(78)
        .forPeriod(parseISO("2023-01-01T00:00:00"), parseISO("2023-03-24T00:00:00"))
        .build();

      const requestsByPeriod = mergeRequestsByPeriod(new MergeRequestStats(mergeRequests));

      expect(requestsByPeriod.map((stat) => stat.index)).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });
});

abstract class MemoryRepository<T> implements Repository<T> {
  protected entities: T[] = [];

  persist(entity: T) {
    this.entities.push(entity);
  }
}

class MergeRequestMemoryRepository extends MemoryRepository<MergeRequest> implements MergeRequestRepository {
  getMergeRequestsForPeriod = (projectId: number, fromDate: Date, toDate: Date): Promise<MergeRequest[]> => {
    const mergeRequests = this.entities.filter(
      (mergeRequest) =>
        mergeRequest.projectId == projectId &&
        compareAsc(mergeRequest.createdAt, fromDate) >= 0 &&
        compareDesc(mergeRequest.createdAt, toDate) >= 0
    );
    return Promise.all(mergeRequests);
  };
}
