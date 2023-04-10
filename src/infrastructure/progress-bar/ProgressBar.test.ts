import { ProgressBar, progressBar } from "./ProgressBar.js";
import { CustomProgressBar } from "../../__tests__/CustomProgressBar.js";
import parseLinkHeader from "parse-link-header";
import { Title } from "./Title.js";
import { CustomGenericBar } from "./CustomMultiBar.js";
import {
  ProgressBarCreateStrategies,
  ProgressBarCreateStrategy,
  ProgressBarUpdateStrategy,
  ProgressBarUpdateStrategies,
} from "./Strategies";

describe("Progress Bar decorator", () => {
  const descriptor = (): PropertyDescriptor => {
    return {
      value: (args: any[]) => args,
    };
  };

  const callProgressBarAndExecuteDescriptor = (
    title: string,
    customProgressBar: CustomProgressBar,
    propertyDescriptor: PropertyDescriptor,
    args: any = "any arg"
  ) => {
    const aProgressBar = progressBar(title, customProgressBar);
    aProgressBar({}, "key", propertyDescriptor);
    propertyDescriptor.value(args);
  };

  it("should register a progress bar", async () => {
    const customProgressBar = new CustomProgressBar();
    callProgressBarAndExecuteDescriptor("a progress bar", customProgressBar, descriptor());

    await new Promise((f) => setTimeout(f, 1));
    expect(customProgressBar.bars.size).toEqual(1);
    expect(customProgressBar.bars.values().next().value.title).toEqual("a progress bar");
  });

  it("should increment a progress bar", async () => {
    const customProgressBar = new CustomProgressBar();
    callProgressBarAndExecuteDescriptor("a progress bar", customProgressBar, descriptor());
    await new Promise((f) => setTimeout(f, 1));

    callProgressBarAndExecuteDescriptor("a progress bar", customProgressBar, descriptor());
    await new Promise((f) => setTimeout(f, 1));

    expect(customProgressBar.bars.size).toEqual(1);
    const bar: CustomGenericBar = customProgressBar.bars.values().next().value.bar;
    expect(bar.getProgress()).toEqual(0.01);
  });

  describe("Pagination", () => {
    jest.mock("cli-progress", () => {
      jest.fn().mockImplementation(() => {
        return {
          MultiBar: jest.fn(),
        };
      });
    });

    it("should progress when paginating", async () => {
      const customProgressBar = new CustomProgressBar();
      const firstPagination = parseLinkHeader(
        '<http://gitlab/merge_requests?order_by=created_at&page=2>; rel="next", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=5>; rel="last"'
      );
      callProgressBarAndExecuteDescriptor(Title.Paginate, customProgressBar, descriptor(), firstPagination);
      await new Promise((f) => setTimeout(f, 1));
      const secondPagination = parseLinkHeader(
        '<http://gitlab/merge_requests?order_by=created_at&page=3>; rel="next", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=5>; rel="last"'
      );
      callProgressBarAndExecuteDescriptor(Title.Paginate, customProgressBar, descriptor(), secondPagination);
      await new Promise((f) => setTimeout(f, 1));
      const thirdPagination = parseLinkHeader(
        '<http://gitlab/merge_requests?order_by=created_at&page=4>; rel="next", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=5>; rel="last"'
      );

      callProgressBarAndExecuteDescriptor(Title.Paginate, customProgressBar, descriptor(), thirdPagination);
      await new Promise((f) => setTimeout(f, 1));

      expect(customProgressBar.bars.size).toEqual(1);
      const bar: CustomGenericBar = customProgressBar.bars.values().next().value.bar;
      expect(bar.getTotal()).toEqual(5);
      expect(bar.getProgress()).toEqual(0.8);
    });

    it("should stop when pagination ends", async () => {
      const customProgressBar = new CustomProgressBar();
      const firstPagination = parseLinkHeader(
        '<http://gitlab/merge_requests?order_by=created_at&page=2>; rel="next", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=3>; rel="last"'
      );
      callProgressBarAndExecuteDescriptor(Title.Paginate, customProgressBar, descriptor(), firstPagination);
      await new Promise((f) => setTimeout(f, 1));
      const secondPagination = parseLinkHeader(
        '<http://gitlab/merge_requests?order_by=created_at&page=3>; rel="next", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=3>; rel="last"'
      );

      callProgressBarAndExecuteDescriptor(Title.Paginate, customProgressBar, descriptor(), secondPagination);
      await new Promise((f) => setTimeout(f, 1));

      expect(customProgressBar.bars.size).toEqual(1);
      const bar: CustomGenericBar = customProgressBar.bars.values().next().value.bar;
      expect(bar.getTotal()).toEqual(3);
      expect(bar.getProgress()).toEqual(1);
      expect(bar["stopCalled" as keyof CustomGenericBar]).toBeTruthy();
    });

    it("should not display progress if no next links in pagination", async () => {
      const customProgressBar = new CustomProgressBar();
      const firstPagination = parseLinkHeader(
        '<http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=3>; rel="last"'
      );

      callProgressBarAndExecuteDescriptor(Title.Paginate, customProgressBar, descriptor(), firstPagination);
      await new Promise((f) => setTimeout(f, 1));

      expect(customProgressBar.bars.size).toEqual(0);
    });

    it("should not display progress if no links in pagination", async () => {
      const customProgressBar = new CustomProgressBar();

      callProgressBarAndExecuteDescriptor(Title.Paginate, customProgressBar, descriptor(), null);
      await new Promise((f) => setTimeout(f, 1));

      expect(customProgressBar.bars.size).toEqual(0);
    });
  });

  describe("Overall", () => {
    it("should make the overall process progress", async () => {
      ProgressBarCreateStrategiesForTests.addAnyBarStrategy();
      ProgressBarUpdateStrategiesForTests.addAnyBarStrategy();
      const customProgressBar = new CustomProgressBar();
      callProgressBarAndExecuteDescriptor(Title.Overall, customProgressBar, descriptor());
      await new Promise((f) => setTimeout(f, 1));
      callProgressBarAndExecuteDescriptor("any bar", customProgressBar, descriptor());
      await new Promise((f) => setTimeout(f, 1));
      callProgressBarAndExecuteDescriptor("another bar", customProgressBar, descriptor());
      await new Promise((f) => setTimeout(f, 1));

      callProgressBarAndExecuteDescriptor("any bar", customProgressBar, descriptor());
      await new Promise((f) => setTimeout(f, 1));

      expect(customProgressBar.bars.size).toEqual(3);
      const bar: CustomGenericBar = customProgressBar.bars.values().next().value.bar;
      expect(bar.getProgress()).toEqual(0.4);
    });

    it.skip("should stop all processes when overall is done", async () => {
      ProgressBarCreateStrategiesForTests.addAnyBarStrategy(1);
      ProgressBarUpdateStrategiesForTests.addAnyBarStrategy(1);
      const customProgressBar = new CustomProgressBar();
      callProgressBarAndExecuteDescriptor(Title.Overall, customProgressBar, descriptor());
      await new Promise((f) => setTimeout(f, 1));
      callProgressBarAndExecuteDescriptor("any bar", customProgressBar, descriptor());
      await new Promise((f) => setTimeout(f, 1));

      callProgressBarAndExecuteDescriptor("any bar", customProgressBar, descriptor());
      await new Promise((f) => setTimeout(f, 1));

      const overAllBar: CustomGenericBar = customProgressBar.bars.values().next().value.bar;
      expect(overAllBar.getProgress()).toEqual(1);
      expect(overAllBar["stopCalled" as keyof CustomGenericBar]).toBeTruthy();
      const anyBar: CustomGenericBar = customProgressBar.bars.values().next().value.bar;
      expect(anyBar.getProgress()).toEqual(1);
      expect(anyBar["stopCalled" as keyof CustomGenericBar]).toBeTruthy();
    });
  });
});

class ProgressBarCreateStrategiesForTests extends ProgressBarCreateStrategies {
  static addAnyBarStrategy(total = 5) {
    this.strategies.set(
      "any bar",
      new (class implements ProgressBarCreateStrategy {
        apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Title }) {
          progressBar.add("any bar", { total: total, startValue: 0 }, { title: "any bar", total: 40, value: 0 });
        }
      })()
    );
  }
}

class ProgressBarUpdateStrategiesForTests extends ProgressBarUpdateStrategies {
  static addAnyBarStrategy(value = 4) {
    this.strategies.set(
      "any bar",
      new (class implements ProgressBarUpdateStrategy {
        apply(bar: CustomGenericBar, parameters?: { title: string | Title; args: any[] }) {
          bar.update(value);
          return Promise.resolve();
        }
      })()
    );
  }
}
