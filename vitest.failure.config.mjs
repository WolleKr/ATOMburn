import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/fixtures/intentional-failure.fixture.mjs"],
    reporters: ["junit"],
    outputFile: {
      junit: "artifacts/test-reports/sprint-00/reporter-contract/junit.xml"
    }
  }
});

