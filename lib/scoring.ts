interface ScoringInput {
  codeScore: number;
  mcqScore: number;
  explanationScore: number;
  resumeScore: number;
  pasteCount: number;
  tabSwitchCount: number;
  fastCompletion: boolean;
  explanationContradiction: boolean;
}

export function calculatePassport(i: ScoringInput) {
  // Aggregate weighted score:
  // Coding: 45%, MCQs: 25%, Explanation: 20%, Resume: 10%
  const finalScore =
    i.codeScore * 0.45 +
    i.mcqScore * 0.25 +
    i.explanationScore * 0.20 +
    i.resumeScore * 0.10;

  // Base confidence starts at 70 (Tier 1 Lite)
  let confidence = 70;

  // Confidence Penalties
  if (i.pasteCount > 3) {
    confidence -= 15;
  }
  if (i.tabSwitchCount > 5) {
    confidence -= 10;
  }
  if (i.fastCompletion) {
    confidence -= 10; // completed in under 3 minutes total
  }
  if (i.explanationContradiction) {
    confidence -= 20; // AI flag: explanation contradicts code logic
  }

  const confidencePenalty = 70 - confidence;
  const finalConfidence = Math.max(0, Math.min(100, confidence));

  return {
    finalScore: Math.round(finalScore * 10) / 10,
    baseConfidence: 70,
    confidencePenalty: Math.max(0, confidencePenalty),
    finalConfidence,
  };
}
