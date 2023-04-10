import { Links } from "parse-link-header";
import { ProgressBar } from "./ProgressBar.js";
import { Title } from "./Title.js";
import { CustomGenericBar } from "./CustomMultiBar.js";

function getLinkHeaderPageValue(links: Links, rel: string) {
  return parseInt(
    links[rel].url
      .split("&")
      .reduce((p, c) => {
        const components = c.split("=");
        p.set(components[0], components[1]);
        return p;
      }, new Map<string, string>())
      .get("page")
  );
}

interface ProgressBarStrategy {
  apply(bar: CustomGenericBar, parameters?: { title: string | Title; args: any[] }): void;
}

class PaginationProgressBarUpdateStrategy implements ProgressBarStrategy {
  apply(bar: CustomGenericBar, parameters: { title: string | Title; args: any[] }): void {
    const links: Links = parameters.args[0];
    const currentPageNumber = getLinkHeaderPageValue(links, "next");
    const totalPages = getLinkHeaderPageValue(links, "last");
    bar.update(currentPageNumber, {
      title: parameters.title,
      value: currentPageNumber,
      total: totalPages,
    });
  }
}

class DefaultProgressBarUpdateStrategy implements ProgressBarStrategy {
  apply(bar: CustomGenericBar): void {
    bar.update(1);
  }
}

interface ProgressBarCreateStrategy {
  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Title }): void;
}

class PaginationProgressBarCreateStrategy implements ProgressBarCreateStrategy {
  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Title }): void {
    const links: Links = param.args[0];
    const totalPages = getLinkHeaderPageValue(links, "last");
    progressBar.add(
      param.title,
      { total: totalPages, startValue: 0 },
      {
        title: param.title,
        value: 0,
        total: totalPages,
      }
    );
  }
}

class DefaultProgressBarCreateStrategy implements ProgressBarCreateStrategy {
  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Title }): void {
    progressBar.add(param.title);
  }
}

export class ProgressBarCreateStrategies {
  private static strategies: Map<string, ProgressBarCreateStrategy> = new Map([
    [Title.Paginate, new PaginationProgressBarCreateStrategy()],
  ]);

  static for(title: string | Title): ProgressBarCreateStrategy {
    const progressBarStrategy = this.strategies.get(title);
    if (progressBarStrategy) {
      return progressBarStrategy;
    }
    return new DefaultProgressBarCreateStrategy();
  }
}

export class ProgressBarUpdateStrategies {
  private static strategies: Map<string, ProgressBarStrategy> = new Map([
    [Title.Paginate, new PaginationProgressBarUpdateStrategy()],
  ]);

  static for(title: string | Title): ProgressBarStrategy {
    const progressBarStrategy = this.strategies.get(title);
    if (progressBarStrategy) {
      return progressBarStrategy;
    }
    return new DefaultProgressBarUpdateStrategy();
  }
}
