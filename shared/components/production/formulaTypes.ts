/** Worked example shown at the bottom of a formula drawer. */
export interface ColumnFormulaExample {
  /** Input lines, rendered one per row. */
  given: string[];
  /** The resulting value, including the arithmetic that produced it. */
  result: string;
}

/** Everything needed to explain how one report column is calculated. */
export interface ColumnFormula {
  title: string;
  /** The formula itself, rendered as monospace. */
  formula: string;
  /** Plain-language description of what the column means. */
  meaning: string;
  /** Source fields the formula reads, rendered as monospace chips. */
  fields: string[];
  example: ColumnFormulaExample;
  /** Optional warning about when the column behaves unexpectedly. */
  caveat?: string;
}

/** Optional invariant pinned below the example (e.g. "Total = A + B + C"). */
export interface ColumnFormulaIdentity {
  formula: string;
  example?: string;
}
