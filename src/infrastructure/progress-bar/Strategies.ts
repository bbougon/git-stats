import { Links } from "parse-link-header";
import { getBarNameFrom, ProgressBar } from "./ProgressBar.js";
import { Type } from "./Type.js";
import { CustomGenericBar } from "./CustomMultiBar.js";

type PageNumber = number;

const getLinkHeaderPageValue = (links: Links, rel: string): PageNumber => {
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
};

interface ProgressBarUpdateStrategy {
  apply(bar: CustomGenericBar, parameters?: { title: string | Type; args: any[] }): void;
}

class PaginationProgressBarUpdateStrategy implements ProgressBarUpdateStrategy {
  apply(bar: CustomGenericBar, parameters: { title: string | Type; args: any[] }): void {
    const links: Links = parameters.args[0];
    let currentPageNumber = 1;
    let totalPages = 1;
    if (links !== null) {
      currentPageNumber = getLinkHeaderPageValue(links, "next");
      totalPages = getLinkHeaderPageValue(links, "last");
    }
    bar.update(currentPageNumber, {
      title: getBarNameFrom(parameters.args, parameters.title),
      value: currentPageNumber,
      total: totalPages,
    });
    if (bar.getTotal() === currentPageNumber) {
      bar.stop();
    }
  }
}

class DefaultProgressBarUpdateStrategy implements ProgressBarUpdateStrategy {
  apply(bar: CustomGenericBar): void {
    bar.update(1);
  }
}

interface ProgressBarCreateStrategy {
  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Type }): void;
}

class PaginationProgressBarCreateStrategy implements ProgressBarCreateStrategy {
  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Type }): void {
    const links: Links = param.args[0];
    const title = getBarNameFrom(param.args, param.title);
    if (links !== null && links["next"] !== undefined) {
      getLinkHeaderPageValue(links, "next");
      const totalPages = getLinkHeaderPageValue(links, "last");
      progressBar.add(
        title,
        { total: totalPages, startValue: 0 },
        {
          title,
          value: 0,
          total: totalPages,
        }
      );
    } else if (links === null) {
      progressBar.add(
        title,
        { total: 1, startValue: 0 },
        {
          title,
          value: 1,
          total: 1,
        }
      );
    }
  }
}

class DefaultProgressBarCreateStrategy implements ProgressBarCreateStrategy {
  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Type }): void {
    progressBar.add(param.title);
  }
}

class GenerateReportProgressBarCreateStrategy implements ProgressBarCreateStrategy {
  constructor(private readonly title: Type) {}

  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Type }): void {
    progressBar.add(this.title, { total: 1, startValue: 0 }, { title: this.title, total: 1, value: 0 });
  }
}

class ProgressBarCreateStrategies {
  protected static strategies: Map<string, ProgressBarCreateStrategy> = new Map([
    [Type.Paginate, new PaginationProgressBarCreateStrategy()],
    [Type.Generate_CSV, new GenerateReportProgressBarCreateStrategy(Type.Generate_CSV)],
    [Type.Generate_HTML, new GenerateReportProgressBarCreateStrategy(Type.Generate_HTML)],
  ]);

  static for(title: string | Type): ProgressBarCreateStrategy {
    const progressBarStrategy = this.strategies.get(title);
    if (progressBarStrategy) {
      return progressBarStrategy;
    }
    return new DefaultProgressBarCreateStrategy();
  }
}

class GenerateReportProgressBarUpdateStrategy implements ProgressBarUpdateStrategy {
  apply(bar: CustomGenericBar, parameters?: { title: string | Type; args: any[] }): void {
    bar.update(1);
  }
}

class ProgressBarUpdateStrategies {
  protected static strategies: Map<string, ProgressBarUpdateStrategy> = new Map([
    [Type.Paginate, new PaginationProgressBarUpdateStrategy()],
    [Type.Generate_CSV, new GenerateReportProgressBarUpdateStrategy()],
    [Type.Generate_HTML, new GenerateReportProgressBarUpdateStrategy()],
  ]);

  static for(title: string | Type): ProgressBarUpdateStrategy {
    const progressBarStrategy = this.strategies.get(title);
    if (progressBarStrategy) {
      return progressBarStrategy;
    }
    return new DefaultProgressBarUpdateStrategy();
  }
}

export {
  ProgressBarCreateStrategies,
  ProgressBarUpdateStrategies,
  ProgressBarUpdateStrategy,
  ProgressBarCreateStrategy,
};
