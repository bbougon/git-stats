import { progressBar } from "./ProgressBar";
import { CustomProgressBar } from "../../__tests__/CustomProgressBar";
import { SingleBar } from "cli-progress";
import parseLinkHeader from "parse-link-header";
import { Title } from "./Title";
import { CustomGenericBar } from "./CustomMultiBar";

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
    it("should adapt when paginating", async () => {
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
      const bar: SingleBar = customProgressBar.bars.values().next().value.bar;
      expect(bar.getTotal()).toEqual(100);
    });
  });
});
