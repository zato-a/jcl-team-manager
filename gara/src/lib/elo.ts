// 多人数Elo（N人中1人が負ける形式）
//
// 各プレイヤー i が「その試合で負ける確率」P_i を softmax で計算:
//   P_i = 10^(-R_i/400) / Σ 10^(-R_j/400)
// （2人時に標準Eloの敗北確率と一致する）
//
// レート更新:
//   ΔR_i = K × (P_i − L_i)   (L_i は実際に負けた=1, それ以外=0)
//
// 性質:
//   - Σ ΔR = 0（ゼロサム）
//   - 高レートほど P_i が小さい → 負けたとき大きく下がる
//   - 参加人数 N が増えると 1 人あたりの P_i が自然に小さくなる

export function expectedLossProbabilities(ratings: number[]): number[] {
  if (ratings.length === 0) return []
  const min = Math.min(...ratings)
  const w = ratings.map(r => Math.pow(10, -(r - min) / 400))
  const s = w.reduce((a, b) => a + b, 0)
  return w.map(x => x / s)
}

export function computeRatingDeltas(
  ratings: number[],
  loserIndex: number,
  k: number,
): number[] {
  const probs = expectedLossProbabilities(ratings)
  return ratings.map((_, i) => {
    const actualLoss = i === loserIndex ? 1 : 0
    return k * (probs[i] - actualLoss)
  })
}
