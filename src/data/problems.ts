import easyProblems from "./easy-level.json";
import mediumProblems from "./medium-level.json";
import hardProblems from "./hard-level.json";

export const problems: Problem[] = [
  ...easyProblems,
  ...mediumProblems,
  ...hardProblems
];

export interface TestCase {
  input: string;
  output: string;
}

export interface Problem {
  id: number;
  difficulty: string;
  title: string;
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  sampleInput?: string;
  sampleOutput?: string;
  testCases?: TestCase[];
}