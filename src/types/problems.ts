export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface Problem {
  id: string;
  difficulty: string;
  title: string;
  description: string;
  constraints: string[];
  inputFormat: string;
  outputFormat: string;
  visibleTestCases: TestCase[];
  hiddenTestCases: TestCase[];
}