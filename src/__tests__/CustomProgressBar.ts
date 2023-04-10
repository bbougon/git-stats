import { ProgressBar } from "../infrastructure/progress-bar/ProgressBar";
import { CustomGenericBar } from "../infrastructure/progress-bar/CustomMultiBar";

export class CustomProgressBar extends ProgressBar {
  constructor() {
    super();
  }

  get bar() {
    return this._bar;
  }

  get bars(): Set<{ title: string; bar: CustomGenericBar }> {
    return this._bars;
  }
}
