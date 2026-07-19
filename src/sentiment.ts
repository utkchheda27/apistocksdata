import type {SentimentLabel} from './types.ts'

const BULLISH = [
  'buy',
  'bull',
  'bullish',
  'long',
  'moon',
  'rally',
  'breakout',
  'uptrend',
  'accumulate',
  'strong',
  'undervalued',
  'growth',
  'outperform',
  'green',
  'pump',
  'rocket',
  'ath',
  'multibagger',
  'target up',
  'add more',
]

const BEARISH = [
  'sell',
  'bear',
  'bearish',
  'short',
  'crash',
  'dump',
  'downtrend',
  'overvalued',
  'weak',
  'avoid',
  'exit',
  'red',
  'fall',
  'correction',
  'sl',
  'stoploss',
  'book profit',
  'cut',
  'loss',
  'underperform',
]

/** Score text from -1 (bearish) to +1 (bullish). */
export function scoreSentiment(text: string): {
  score: number
  label: SentimentLabel
} {
  const lower = text.toLowerCase()
  let bull = 0
  let bear = 0

  for (const word of BULLISH) {
    if (lower.includes(word)) bull += 1
  }
  for (const word of BEARISH) {
    if (lower.includes(word)) bear += 1
  }

  const total = bull + bear
  if (total === 0) return {score: 0, label: 'neutral'}

  const score = (bull - bear) / total
  let label: SentimentLabel = 'neutral'
  if (score >= 0.2) label = 'bullish'
  else if (score <= -0.2) label = 'bearish'
  return {score, label}
}

export function aggregateSentiment(scores: number[]): {
  score: number
  label: SentimentLabel
} {
  if (scores.length === 0) return {score: 0, label: 'neutral'}
  const score = scores.reduce((a, b) => a + b, 0) / scores.length
  let label: SentimentLabel = 'neutral'
  if (score >= 0.15) label = 'bullish'
  else if (score <= -0.15) label = 'bearish'
  return {score, label}
}
