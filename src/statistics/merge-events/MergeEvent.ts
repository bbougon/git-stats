import { GitEvent } from "../Statistics.js";

type MergeEvent = GitEvent & {
  project: number | string | undefined;
  id: number;
  mergedAt: Date | null;
};

export { MergeEvent };
