const nxPreset = require("@nrwl/jest/preset").default;

module.exports = {
    ...nxPreset,
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageProvider: "babel",
    coverageReporters: ["lcov"],
};
