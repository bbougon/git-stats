import { compareAsc, compareDesc, parseISO } from "date-fns";
import { MergeRequest, MergeRequestRepository, mergeRequestsStats, MergeRequestStats } from "./MergeRequest";
import { Repository } from "../Repository";
import { MergeRequestBuilder } from "../__tests__/builder";

describe("Merge requests statistics", () => {
  test("should have merge requests average", async () => {
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

    expect(stats.result()).toEqual({ average: { days: 3, hours: 72 }, total: 3 });
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

    expect(stats.result()).toEqual({ average: { days: 1.04, hours: 25 }, total: 1 });
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
        compareDesc(mergeRequest.mergedAt, toDate) >= 0
    );
    return Promise.all(mergeRequests);
  };
}
