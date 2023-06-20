import { ProgressBar } from "../infrastructure/progress-bar/ProgressBar.js";
import { CustomGenericBar, CustomMultiBar } from "../infrastructure/progress-bar/CustomMultiBar.js";
import { Type } from "../infrastructure/progress-bar/Type";

export class CustomMultiBarForTests implements CustomMultiBar {
  create(
    total: number,
    startValue: number,
    payload: { title: string | Type; value: number; total: number | string }
  ): CustomGenericBar {
    const bar = new (class implements CustomGenericBar {
      public stopCalled = false;
      public progress: number;
      public total: number;

      getProgress(): number {
        return this.progress;
      }

      getTotal(): number {
        return this.total;
      }

      stop(): void {
        this.stopCalled = true;
      }

      update(value: number, payload?: { total: number; title: string | Type; value: number }): void {
        this.progress = value / this.total;
      }
    })();
    bar.progress = payload.value;
    bar.total = total;
    return bar;
  }
}

export class CustomProgressBar extends ProgressBar {
  constructor() {
    super(new CustomMultiBarForTests());
  }

  get bar() {
    return this._bar;
  }

  get bars(): Set<{ title: string; bar: CustomGenericBar }> {
    return this._bars;
  }
}
