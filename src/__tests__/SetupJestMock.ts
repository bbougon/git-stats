import { Chalk } from "chalk";

jest.mock("../infrastructure/progress-bar/Chalk", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return {
    chalk: {
      Chalk: jest.fn().mockImplementation(() => ({ cyan: jest.fn() })),
    },
  };
});
