import { Logger } from "tslog";

export const LogLevel = {
    SILLY: 0,
    TRACE: 1,
    DEBUG: 2,
    INFO: 3,
    WARN: 4,
    ERROR: 5,
    FATAL: 6,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Creates a new tslog {@link Logger} object with the given `name`
 * which will log in a tasteful manner.
 */
export const createLogger = (
    name: string,
    {
        type = "pretty",
        prefix = ["👉"],
        minLevel = LogLevel.INFO,
        prettyErrorTemplate = "\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}",
        prettyLogTemplate = "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t{{fileNameWithLine}}\t{{name}}\t",
    }: {
        prefix?: string[];
        type?: "json" | "pretty" | "hidden";
        minLevel?: LogLevel;
        prettyLogTemplate?: string;
        prettyErrorTemplate?: string;
    } = {}
) => {
    return new Logger({
        name,
        type,
        prefix,
        minLevel,
        prettyLogTemplate,
        prettyErrorTemplate,
        stylePrettyLogs: true,
        prettyErrorStackTemplate:
            "  • {{fileName}}\t{{method}}\n\t{{fileNameWithLine}}",
        prettyErrorParentNamesSeparator: ":",
        prettyErrorLoggerNameDelimiter: "\t",
        prettyLogTimeZone: "UTC",
        prettyLogStyles: {
            logLevelName: {
                "*": ["bold", "black", "bgWhiteBright", "dim"],
                SILLY: ["bold", "white"],
                TRACE: ["bold", "whiteBright"],
                DEBUG: ["bold", "green"],
                INFO: ["bold", "blue"],
                WARN: ["bold", "yellow"],
                ERROR: ["bold", "red"],
                FATAL: ["bold", "redBright"],
            },
            dateIsoStr: "white",
            filePathWithLine: "white",
            name: ["white", "bold"],
            nameWithDelimiterPrefix: ["white", "bold"],
            nameWithDelimiterSuffix: ["white", "bold"],
            errorName: ["bold", "bgRedBright", "whiteBright"],
            fileName: ["yellow"],
        },
    });
};
