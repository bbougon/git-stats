import { Chalk } from "chalk";

jest.mock("../infrastructure/progress-bar/Chalk", () => {
  return {
    chalk: {
      Chalk: jest.fn().mockImplementation(() => ({ cyan: jest.fn() })),
    },
  };
});
