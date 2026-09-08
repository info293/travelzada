import { VendorReward } from '@/components/admin/types'

/**
 * Selects a winning reward using a Weighted Probability Algorithm.
 * Higher weight (probability) = higher chance of winning.
 * Weight of 1 out of 1000 total weight means ~0.1% chance (1 in 1000).
 */
export function selectWeightedReward(rewards: VendorReward[]): VendorReward {
  const selectedIndex = selectWeightedRewardIndex(rewards)
  return rewards[selectedIndex]
}

/**
 * Returns the index of the selected reward using weighted random sampling.
 */
export function selectWeightedRewardIndex(rewards: VendorReward[]): number {
  if (!rewards || rewards.length === 0) return 0

  // Standardize weights (default to 10 if probability is undefined or <= 0)
  const weights = rewards.map((r) => {
    if (r.probability !== undefined && r.probability > 0) {
      return Number(r.probability)
    }
    return 10
  })

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight <= 0) return 0

  let randomVal = Math.random() * totalWeight

  for (let i = 0; i < weights.length; i++) {
    if (randomVal < weights[i]) {
      return i
    }
    randomVal -= weights[i]
  }

  return rewards.length - 1
}
