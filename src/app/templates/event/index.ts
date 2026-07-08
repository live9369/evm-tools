import { CodeTemplate } from "../types";
import { basicTemplate } from "./basic";
import { filterTemplate } from "./filter";
import { queryTemplate } from "./query";
import { customTemplate } from "./custom";
import { logTemplate } from "./log";

export { basicTemplate, filterTemplate, queryTemplate, customTemplate, logTemplate };

export const eventTemplates: CodeTemplate[] = [
    basicTemplate,
    filterTemplate,
    queryTemplate,
    customTemplate,
    logTemplate,
];

