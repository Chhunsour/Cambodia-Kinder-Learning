/**
 * Randomized Arithmetic Generator for Parent Gate.
 *
 * Generates simple addition and subtraction challenges with positive results.
 * Adult math barrier designed to prevent accidental child entry.
 */

export interface MathChallenge {
  numA: number;
  numB: number;
  operation: "+" | "-";
  expectedAnswer: number;
  questionEn: string;
  questionKm: string;
}

/**
 * Converts standard Arabic numerals to Khmer script numerals.
 */
export function toKhmerDigits(val: number | string): string {
  const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(val)
    .split("")
    .map((ch) => {
      const d = parseInt(ch, 10);
      return isNaN(d) ? ch : khmerDigits[d];
    })
    .join("");
}

/**
 * Generates a randomized arithmetic problem:
 * - Addition: e.g. 6 + 7, 8 + 9, 14 + 7
 * - Subtraction: e.g. 14 - 5, 17 - 8, 18 - 7
 * Results are always strictly positive (>= 3).
 */
export function generateMathGateChallenge(): MathChallenge {
  const isAddition = Math.random() < 0.5;

  if (isAddition) {
    // 6 to 15
    const numA = Math.floor(Math.random() * 10) + 6;
    // 4 to 12
    const numB = Math.floor(Math.random() * 9) + 4;
    const expectedAnswer = numA + numB;

    return {
      numA,
      numB,
      operation: "+",
      expectedAnswer,
      questionEn: `${numA} + ${numB}`,
      questionKm: `${toKhmerDigits(numA)} + ${toKhmerDigits(numB)}`,
    };
  } else {
    // 12 to 20
    const numA = Math.floor(Math.random() * 9) + 12;
    // 3 to 9 (guaranteed numA > numB, difference >= 3)
    const numB = Math.floor(Math.random() * 7) + 3;
    const expectedAnswer = numA - numB;

    return {
      numA,
      numB,
      operation: "-",
      expectedAnswer,
      questionEn: `${numA} - ${numB}`,
      questionKm: `${toKhmerDigits(numA)} - ${toKhmerDigits(numB)}`,
    };
  }
}
