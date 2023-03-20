/* eslint-disable */
export default {
    displayName: "hexworks-cobalt-events",
    preset: "../../../jest.preset.js",
    globals: {
        "ts-jest": {
            tsconfig: "<rootDir>/tsconfig.spec.json",
        },
    },
    transform: {
        "^.+\\.[tj]s$": "ts-jest",
    },
    moduleFileExtensions: ["ts", "js", "html"],
    coverageDirectory: "../../../coverage/libs/hexworks/cobalt-events",
};
