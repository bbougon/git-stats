import "reflect-metadata";
import { ProgressBarCreateStrategies, ProgressBarUpdateStrategies } from "./Strategies.js";
import { Title } from "./Title.js";
import { CliProgressMultiBar, CustomGenericBar, CustomMultiBar } from "./CustomMultiBar.js";

class ProgressBar {
  private static _progressBar: ProgressBar;
  protected readonly _bar: CustomMultiBar;
  protected readonly _bars: Set<{ title: string; bar: CustomGenericBar }> = new Set();

  constructor(customMultiBar: CustomMultiBar = new CliProgressMultiBar()) {
    this._bar = customMultiBar;
  }

  public static progressBar(multiBar: CustomMultiBar = new CliProgressMultiBar()): ProgressBar {
    if (this._progressBar === undefined) {
      this._progressBar = new ProgressBar(multiBar);
    }
    return this._progressBar;
  }

  add(
    title: string | Title,
    initialParameter: { total: number; startValue: number } = { total: 100, startValue: 0 },
    payload: { title: string | Title; value: number; total: number | string } = {
      title,
      value: 0,
      total: "N/A",
    }
  ): void {
    const bar = this._bar.create(initialParameter.total, initialParameter.startValue, payload);
    this._bars.add({ title, bar });
  }

  stopAll() {
    this._bars.forEach((bar) => bar.bar.stop());
  }

  hasBar(title: string | Title): Promise<CustomGenericBar> {
    for (const bar of this._bars) {
      if (bar.title === title) {
        return Promise.resolve(bar.bar);
      }
    }
    return Promise.reject();
  }
}

export { ProgressBar };

function progressBar(title: string | Title, progressBar: ProgressBar = ProgressBar.progressBar()) {
  return function (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) {
    const original = descriptor.value;
    descriptor.value = function (...args: any[]) {
      progressBar
        .hasBar(title)
        .then((bar) => {
          ProgressBarUpdateStrategies.for(title).apply(bar, { title, args });
        })
        .catch(() => {
          ProgressBarCreateStrategies.for(title).apply(progressBar, { title, args });
        });
      return original.call(this, ...args);
    };
  };
}

export { progressBar };
