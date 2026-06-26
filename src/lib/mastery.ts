type AttemptRecord = {
  isCorrect: boolean;
  submittedAt: Date;
};

export function calculateMastery(attempts: AttemptRecord[]): number {
  if (attempts.length === 0) return 0;

  // Weight recent attempts more: weight = e^(-decay * age_in_days)
  const DECAY = 0.05;
  const now = Date.now();
  let weightedCorrect = 0;
  let totalWeight = 0;

  for (const attempt of attempts) {
    const ageMs = now - new Date(attempt.submittedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const weight = Math.exp(-DECAY * ageDays);
    if (attempt.isCorrect) weightedCorrect += weight;
    totalWeight += weight;
  }

  return totalWeight === 0 ? 0 : Math.round((weightedCorrect / totalWeight) * 100);
}

export function calculateConfidence(
  attemptCount: number,
  lastUpdated: Date
): number {
  if (attemptCount === 0) return 0;

  const daysSinceLastAttempt =
    (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);

  // Confidence from volume: saturates at 20 attempts → 100%
  const volumeScore = Math.min((attemptCount / 20) * 100, 100);

  // Recency penalty: decays to 0 after 60 days of inactivity
  const recencyScore = Math.max(0, 100 - (daysSinceLastAttempt / 60) * 100);

  return Math.round((volumeScore * 0.6 + recencyScore * 0.4));
}
