export type VerificationStatus = 'verified' | 'not_verified' | 'unable_to_determine';

export interface VerificationResult {
  status: VerificationStatus;
  /** The dollar amount used to make the decision, if found. */
  value: number | null;
  /** The raw line from the PDF that contained the income figure. */
  label: string | null;
}
