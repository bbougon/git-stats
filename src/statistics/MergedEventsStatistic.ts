import { Period, StatisticFlow } from "./Statistics.js";
import { differenceInHours, getMonth, getWeek } from "date-fns";
import Duration from "./Duration.js";
import moment from "moment";

export class MergedEventsStatisticFlow implements StatisticFlow {
  readonly events: Period[] = [];

  constructor(period: Period | undefined, readonly index: number) {
    if (period !== undefined) {
      this.events.push(period);
    }
  }

  total(): number {
    return this.events.length;
  }

  addEvent(period: Period) {
    this.events.push(period);
  }

  static month(period: Period): StatisticFlow {
    return new MergedEventsStatisticFlow(period, getMonth(period.end));
  }

  static week(period: Period): StatisticFlow {
    return new MergedEventsStatisticFlow(period, getWeek(period.end));
  }

  static empty(index: number) {
    return new MergedEventsStatisticFlow(undefined, index);
  }

  average(): Duration {
    const hoursSpent = this.events.reduce(
      (accumulator, currentValue) => accumulator + differenceInHours(currentValue.end, currentValue.start),
      0
    );
    if (this.events.length > 0) {
      const duration = moment.duration(hoursSpent / this.events.length, "hours");
      return {
        months: parseInt(duration.months().toFixed()),
        days: parseInt(duration.days().toFixed()),
        hours: parseInt(duration.hours().toFixed()),
        minutes: parseInt(duration.minutes().toFixed()),
        seconds: parseInt(duration.seconds().toFixed()),
      };
    }
    return { days: 0, hours: 0, minutes: 0, months: 0, seconds: 0 };
  }

  median(): Duration {
    const hoursSeries = this.events.map((period) => ({ hours: differenceInHours(period.end, period.start) }));
    if (hoursSeries.length > 0) {
      hoursSeries.sort((current, next) => (current.hours > next.hours ? 1 : -1));
      const seriesIndex = (hoursSeries.length + 1) / 2 - 1;
      const isHourSeriesEvent = (hoursSeries.length + 1) % 2 === 0;
      let duration = {} as moment.Duration;
      if (isHourSeriesEvent) {
        duration = moment.duration(hoursSeries[seriesIndex].hours, "hours");
      } else {
        const hours = (hoursSeries[Math.floor(seriesIndex)].hours + hoursSeries[Math.ceil(seriesIndex)].hours) / 2;
        duration = moment.duration(hours, "hours");
      }
      return {
        months: parseInt(duration.months().toFixed()),
        days: parseInt(duration.days().toFixed()),
        hours: parseInt(duration.hours().toFixed()),
        minutes: parseInt(duration.minutes().toFixed()),
        seconds: parseInt(duration.seconds().toFixed()),
      };
    }
    return { days: 0, hours: 0, minutes: 0, months: 0, seconds: 0 };
  }
}
