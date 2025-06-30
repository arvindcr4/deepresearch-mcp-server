/// <reference types="jest" />

declare global {
  var testUtils: {
    generateMockId: () => string;
    createMockProject: (overrides?: any) => any;
    createMockTask: (overrides?: any) => any;
    createMockKnowledge: (overrides?: any) => any;
  };
}

export {};