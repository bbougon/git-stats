import { Repository } from "../../Repository.js";
import { RequestParameters } from "../../../index.js";
import { GitEvent } from "../Statistics.js";

type MergeEvent = GitEvent & {
  project: number | string | undefined;
  id: number;
  mergedAt: Date | null;
  closedAt: Date | null;
};

interface MergeEventRepository extends Repository<MergeEvent> {
  getMergeEventsForPeriod(requestParameters: RequestParameters): Promise<MergeEvent[]>;
}

export { MergeEvent, MergeEventRepository };
