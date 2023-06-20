import * as chalk from "./Chalk.js";
import { MultiBar } from "cli-progress";
import { Type } from "./Type.js";

export interface CustomGenericBar {
  getTotal(): number;

  stop(): void;

  update(value: number): void;
  update(value: number, payload: { total: number; title: string | Type; value: number }): void;

  getProgress(): number;
}

export interface CustomMultiBar {
  create(
    total: number,
    startValue: number,
    payload: { title: string | Type; value: number; total: number | string }
  ): CustomGenericBar;
}

export class CliProgressMultiBar implements CustomMultiBar {
  private multiBar: MultiBar;

  constructor() {
    const bar = new chalk.chalk.Chalk().cyan;
    this.multiBar = new MultiBar({
      format: "{title} | " + bar("{bar}") + " | {value}/{total}",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
      stopOnComplete: true,
      clearOnComplete: false,
    });
  }

  create(
    total: number,
    startValue: number,
    payload: { title: string | Type; value: number; total: number | string }
  ): CustomGenericBar {
    const bar = this.multiBar.create(total, startValue, payload);
    return new (class implements CustomGenericBar {
      getTotal(): number {
        return bar.getTotal();
      }

      stop() {
        bar.stop();
      }

      update(currentPageNumber: number, payload?: { total: number; title: string | Type; value: number }): void {
        bar.update(currentPageNumber, payload);
      }

      getProgress(): number {
        return bar.getProgress();
      }
    })();
  }
}
