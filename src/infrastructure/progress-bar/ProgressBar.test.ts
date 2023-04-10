import { progressBar } from "./ProgressBar.js";
import { CustomProgressBar } from "../../__tests__/CustomProgressBar.js";
import parseLinkHeader from "parse-link-header";
import { Title } from "./Title.js";
import { CustomGenericBar } from "./CustomMultiBar.js";

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
});
