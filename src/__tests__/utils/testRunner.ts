/**
 * Test Runner Utility
 * Provides utilities for running tests with proper setup and cleanup
 */

export interface TestSuite {
  name: string;
  tests: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestCase {
  name: string;
  test: () => Promise<void>;
  timeout?: number;
  skip?: boolean;
}

export interface TestResult {
  suite: string;
  test: string;
  success: boolean;
  duration: number;
  error?: Error;
}

export interface TestReport {
  totalSuites: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

export class TestRunner {
  private suites: TestSuite[] = [];
  private report: TestReport = {
    totalSuites: 0,
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    results: [],
  };

  addSuite(suite: TestSuite): void {
    this.suites.push(suite);
  }

  async runAllSuites(): Promise<TestReport> {
    const startTime = Date.now();
    
    console.log('🚀 Starting test execution...\n');
    
    for (const suite of this.suites) {
      await this.runSuite(suite);
    }
    
    this.report.duration = Date.now() - startTime;
    this.report.totalSuites = this.suites.length;
    
    this.printReport();
    return this.report;
  }

  private async runSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running suite: ${suite.name}`);
    
    try {
      // Run suite setup
      if (suite.setup) {
        await suite.setup();
      }
      
      // Run all tests in the suite
      for (const testCase of suite.tests) {
        if (testCase.skip) {
          this.report.skipped++;
          console.log(`  ⏭️  SKIPPED: ${testCase.name}`);
          continue;
        }
        
        await this.runTest(suite.name, testCase);
      }
      
      // Run suite teardown
      if (suite.teardown) {
        await suite.teardown();
      }
      
    } catch (error) {
      console.error(`❌ Suite setup/teardown failed: ${suite.name}`, error);
    }
    
    console.log('');
  }

  private async runTest(suiteName: string, testCase: TestCase): Promise<void> {
    const startTime = Date.now();
    this.report.totalTests++;
    
    try {
      // Set timeout if specified
      const timeout = testCase.timeout || 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), timeout);
      });
      
      await Promise.race([testCase.test(), timeoutPromise]);
      
      const duration = Date.now() - startTime;
      this.report.passed++;
      this.report.results.push({
        suite: suiteName,
        test: testCase.name,
        success: true,
        duration,
      });
      
      console.log(`  ✅ PASSED: ${testCase.name} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.report.failed++;
      this.report.results.push({
        suite: suiteName,
        test: testCase.name,
        success: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      
      console.log(`  ❌ FAILED: ${testCase.name} (${duration}ms)`);
      console.log(`     Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private printReport(): void {
    console.log('📊 Test Report');
    console.log('==============');
    console.log(`Total Suites: ${this.report.totalSuites}`);
    console.log(`Total Tests:  ${this.report.totalTests}`);
    console.log(`Passed:       ${this.report.passed} ✅`);
    console.log(`Failed:       ${this.report.failed} ❌`);
    console.log(`Skipped:      ${this.report.skipped} ⏭️`);
    console.log(`Duration:     ${this.report.duration}ms`);
    console.log(`Success Rate: ${((this.report.passed / this.report.totalTests) * 100).toFixed(1)}%`);
    
    if (this.report.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.report.results
        .filter(result => !result.success)
        .forEach(result => {
          console.log(`  ${result.suite} > ${result.test}`);
          console.log(`    ${result.error?.message || 'Unknown error'}`);
        });
    }
    
    console.log('');
  }
}

// Utility functions for creating test suites
export const createTestSuite = (name: string, options: Partial<TestSuite> = {}): TestSuite => ({
  name,
  tests: [],
  ...options,
});

export const createTestCase = (name: string, test: () => Promise<void>, options: Partial<TestCase> = {}): TestCase => ({
  name,
  test,
  ...options,
});

// Assertion utilities
export const assert = {
  isTrue: (value: any, message?: string) => {
    if (!value) {
      throw new Error(message || `Expected ${value} to be truthy`);
    }
  },
  
  isFalse: (value: any, message?: string) => {
    if (value) {
      throw new Error(message || `Expected ${value} to be falsy`);
    }
  },
  
  equals: (actual: any, expected: any, message?: string) => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${actual} to equal ${expected}`);
    }
  },
  
  notEquals: (actual: any, expected: any, message?: string) => {
    if (actual === expected) {
      throw new Error(message || `Expected ${actual} to not equal ${expected}`);
    }
  },
  
  isUndefined: (value: any, message?: string) => {
    if (value !== undefined) {
      throw new Error(message || `Expected ${value} to be undefined`);
    }
  },
  
  isDefined: (value: any, message?: string) => {
    if (value === undefined) {
      throw new Error(message || `Expected value to be defined`);
    }
  },
  
  throws: async (fn: () => Promise<any> | any, message?: string) => {
    try {
      await fn();
      throw new Error(message || 'Expected function to throw an error');
    } catch (error) {
      // Expected behavior
    }
  },
  
  doesNotThrow: async (fn: () => Promise<any> | any, message?: string) => {
    try {
      await fn();
    } catch (error) {
      throw new Error(message || `Expected function not to throw, but got: ${error}`);
    }
  },
};