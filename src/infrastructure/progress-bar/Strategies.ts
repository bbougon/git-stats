import { Links } from "parse-link-header";
import { ProgressBar } from "./ProgressBar.js";
import { Title } from "./Title.js";
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
  apply(bar: CustomGenericBar, parameters?: { title: string | Title; args: any[] }): void;
}

class PaginationProgressBarUpdateStrategy implements ProgressBarUpdateStrategy {
  apply(bar: CustomGenericBar, parameters: { title: string | Title; args: any[] }): void {
    const links: Links = parameters.args[0];
    const currentPageNumber = getLinkHeaderPageValue(links, "next");
    const totalPages = getLinkHeaderPageValue(links, "last");
    bar.update(currentPageNumber, {
      title: parameters.title,
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
  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Title }): void;
}

class PaginationProgressBarCreateStrategy implements ProgressBarCreateStrategy {
  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Title }): void {
    const links: Links = param.args[0];
    if (links !== null && links["next"] !== undefined) {
      getLinkHeaderPageValue(links, "next");
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
}

class DefaultProgressBarCreateStrategy implements ProgressBarCreateStrategy {
  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Title }): void {
    progressBar.add(param.title);
  }
}

class GenerateCSVProgressBarCreateStrategy implements ProgressBarCreateStrategy {
  apply(progressBar: ProgressBar, param: { args?: any[]; title: string | Title }): void {
    progressBar.add(Title.Generate_CSV, { total: 1, startValue: 0 }, { title: Title.Generate_CSV, total: 1, value: 0 });
  }
}

class ProgressBarCreateStrategies {
  protected static strategies: Map<string, ProgressBarCreateStrategy> = new Map([
    [Title.Paginate, new PaginationProgressBarCreateStrategy()],
    [Title.Generate_CSV, new GenerateCSVProgressBarCreateStrategy()],
  ]);

  static for(title: string | Title): ProgressBarCreateStrategy {
    const progressBarStrategy = this.strategies.get(title);
    if (progressBarStrategy) {
      return progressBarStrategy;
    }
    return new DefaultProgressBarCreateStrategy();
  }
}

class GenerateCSVProgressBarUpdateStrategy implements ProgressBarUpdateStrategy {
  apply(bar: CustomGenericBar, parameters?: { title: string | Title; args: any[] }): void {
    bar.update(1);
  }
}

class ProgressBarUpdateStrategies {
  protected static strategies: Map<string, ProgressBarUpdateStrategy> = new Map([
    [Title.Paginate, new PaginationProgressBarUpdateStrategy()],
    [Title.Generate_CSV, new GenerateCSVProgressBarUpdateStrategy()],
  ]);

  static for(title: string | Title): ProgressBarUpdateStrategy {
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
