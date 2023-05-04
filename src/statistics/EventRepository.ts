import { Repository } from "../Repository.js";
import { RequestParameters } from "../../index.js";

interface EventRepository<U> extends Repository<U> {
  getEventsForPeriod(requestParameters: RequestParameters): Promise<U[]>;
}

export { EventRepository };
