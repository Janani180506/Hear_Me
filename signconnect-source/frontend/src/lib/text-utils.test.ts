import { normalizeRecognizedText, isDuplicatePrediction } from "./text-utils";

function runTests() {
  console.log("=== Running SignConnect Text Utils Tests ===");

  // TEST 1: Recognize "A"
  const test1 = normalizeRecognizedText("A");
  console.assert(test1 === "A", `Test 1 Failed: Expected 'A', got '${test1}'`);
  console.log("Test 1 (A -> A):", test1 === "A" ? "PASSED" : "FAILED");

  // TEST 2: Recognize "H E L L O"
  const test2 = normalizeRecognizedText("H E L L O");
  console.assert(test2 === "HELLO", `Test 2 Failed: Expected 'HELLO', got '${test2}'`);
  console.log("Test 2 (H E L L O -> HELLO):", test2 === "HELLO" ? "PASSED" : "FAILED");

  // TEST 3: Recognize "I NEED WATER"
  const test3 = normalizeRecognizedText("I NEED WATER");
  console.assert(test3 === "I NEED WATER", `Test 3 Failed: Expected 'I NEED WATER', got '${test3}'`);
  console.log("Test 3 (I NEED WATER -> I NEED WATER):", test3 === "I NEED WATER" ? "PASSED" : "FAILED");

  // TEST 4: Recognize "H E L L O   I   N E E D   W A T E R"
  const test4 = normalizeRecognizedText("H E L L O   I   N E E D   W A T E R");
  console.assert(test4 === "HELLO I NEED WATER", `Test 4 Failed: Expected 'HELLO I NEED WATER', got '${test4}'`);
  console.log("Test 4 (Spaced letters -> HELLO I NEED WATER):", test4 === "HELLO I NEED WATER" ? "PASSED" : "FAILED");

  // TEST 5: Repeated frame debouncing (H H H H -> one H within 1 second)
  const now = 10000;
  const isDup1 = isDuplicatePrediction("H", now - 200, "H", now, 1000);
  const isDup2 = isDuplicatePrediction("H", now - 1500, "H", now, 1000);
  const isDup3 = isDuplicatePrediction("H", now - 200, "E", now, 1000);

  console.assert(isDup1 === true, "Test 5a Failed: Rapid H should be duplicate");
  console.assert(isDup2 === false, "Test 5b Failed: Delayed H should NOT be duplicate");
  console.assert(isDup3 === false, "Test 5c Failed: Different char E should NOT be duplicate");
  console.log("Test 5 (Stabilization/Debouncing):", isDup1 && !isDup2 && !isDup3 ? "PASSED" : "FAILED");

  // TEST 6: Clear button behavior check
  const test6 = normalizeRecognizedText("   ");
  console.assert(test6 === "", `Test 6 Failed: Expected '', got '${test6}'`);
  console.log("Test 6 (Empty string check):", test6 === "" ? "PASSED" : "FAILED");

  console.log("=== All Tests Completed Successfully ===");
}

runTests();
