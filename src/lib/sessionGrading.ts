import { withPyodideTimeout } from "@/lib/pyodideTimeout";

export interface SessionTestCase {
  input: string;
  expected: string;
  description?: string;
}

export interface SessionTestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  description: string;
}

interface PyodideForSessionGrading {
  runPython: (code: string) => unknown;
  globals?: {
    get: (name: string) => unknown;
  };
}

const createFailedResults = (
  testCases: SessionTestCase[],
  error: unknown,
): SessionTestResult[] =>
  testCases.map((testCase, index) => ({
    input: testCase.input,
    expected: testCase.expected,
    actual: String(error),
    passed: false,
    description: testCase.description || `Test ${index + 1}`,
  }));

const cleanupCodeRunner = (pyodide: PyodideForSessionGrading) => {
  try {
    pyodide.runPython(`
import sys
sys.stdout = sys.__stdout__
globals().pop("input", None)
globals().pop("_input_lines", None)
globals().pop("_input_idx", None)
globals().pop("_captured_output", None)
`);
  } catch (error) {
    console.warn("Không thể dọn môi trường chấm session:", error);
  }
};

export const gradeCodeRunnerForSession = (
  pyodide: PyodideForSessionGrading,
  code: string,
  testCases: SessionTestCase[],
): SessionTestResult[] =>
  testCases.map((testCase, index) => {
    const inputLines = testCase.input ? testCase.input.split("\n") : [];

    try {
      pyodide.runPython(`
import sys
from io import StringIO
_input_lines = ${JSON.stringify(inputLines)}
_input_idx = [0]
def input(prompt=""):
    idx = _input_idx[0]
    _input_idx[0] += 1
    return _input_lines[idx] if idx < len(_input_lines) else ""
_captured_output = StringIO()
sys.stdout = _captured_output
`);

      withPyodideTimeout(pyodide, () => pyodide.runPython(code));
      const actual = String(
        pyodide.runPython("_captured_output.getvalue()"),
      ).trim();
      const expected = testCase.expected.trim();

      return {
        input: testCase.input,
        expected,
        actual,
        passed: actual === expected,
        description: testCase.description || `Test ${index + 1}`,
      };
    } catch (error) {
      return {
        input: testCase.input,
        expected: testCase.expected,
        actual: String(error),
        passed: false,
        description: testCase.description || `Test ${index + 1}`,
      };
    } finally {
      cleanupCodeRunner(pyodide);
    }
  });

export const gradeFunctionForSession = (
  pyodide: PyodideForSessionGrading,
  code: string,
  functionName: string,
  testCases: SessionTestCase[],
): SessionTestResult[] => {
  type PythonCallable = ((input: string) => unknown) & {
    destroy?: () => void;
  };
  let pythonFunction: PythonCallable | null = null;

  try {
    withPyodideTimeout(pyodide, () => pyodide.runPython(code));
    const functionProxy = pyodide.globals?.get(functionName);

    if (typeof functionProxy !== "function") {
      return createFailedResults(
        testCases,
        `Chưa thấy hàm ${functionName}()`,
      );
    }
    pythonFunction = functionProxy as PythonCallable;
    const callable = pythonFunction;

    return testCases.map((testCase, index) => {
      try {
        const resultProxy = withPyodideTimeout(pyodide, () =>
          callable(testCase.input),
        );
        const actual = String(resultProxy);

        if (
          typeof resultProxy === "object" &&
          resultProxy !== null &&
          "destroy" in resultProxy &&
          typeof resultProxy.destroy === "function"
        ) {
          resultProxy.destroy();
        }

        return {
          input: testCase.input,
          expected: testCase.expected,
          actual,
          passed: actual === testCase.expected,
          description: testCase.description || `Test ${index + 1}`,
        };
      } catch (error) {
        return {
          input: testCase.input,
          expected: testCase.expected,
          actual: String(error),
          passed: false,
          description: testCase.description || `Test ${index + 1}`,
        };
      }
    });
  } catch (error) {
    return createFailedResults(testCases, error);
  } finally {
    pythonFunction?.destroy?.();
  }
};
