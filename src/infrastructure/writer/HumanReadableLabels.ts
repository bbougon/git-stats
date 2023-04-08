import { Dimension } from "../../statistics/GitStatistics.js";

const HUMAN_READABLE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const buildLabel = (stat: Dimension): string => {
  if (stat.unit === "Month") {
    return HUMAN_READABLE_MONTHS[stat.index];
  }
  return `${stat.unit} ${stat.index}`;
};

export { HUMAN_READABLE_MONTHS, buildLabel };
