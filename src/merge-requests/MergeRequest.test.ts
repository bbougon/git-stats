import * as crypto from "crypto";
import { compareAsc, compareDesc, parseISO } from "date-fns";
import { MergeRequest, MergeRequestRepository, mergeRequestsStats, MergeRequestStats } from "./MergeRequest";
import { Repository } from "../Repository";

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

    expect(stats.result()).toEqual({ average: 3, total: 3 });
  });
});

class MergeRequestBuilder {
  private projectId: number;
  private uuid: crypto.UUID;
  private _createdAt: Date;
  private _mergedAt: Date;

  constructor(projectId: number) {
    this.projectId = projectId;
    this.uuid = crypto.randomUUID();
  }

  createdAt = (createdAt: Date): MergeRequestBuilder => {
    this._createdAt = createdAt;
    return this;
  };

  mergedAt = (mergedAt: Date): MergeRequestBuilder => {
    this._mergedAt = mergedAt;
    return this;
  };

  build = (): MergeRequest => {
    return {
      createdAt: this._createdAt,
      mergedAt: this._mergedAt,
      projectId: this.projectId,
      uuid: this.uuid,
    };
  };
}

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
