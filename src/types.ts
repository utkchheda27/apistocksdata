export type MentionKind = 'post' | 'comment'
export type SentimentLabel = 'bullish' | 'bearish' | 'neutral'

export type StockMention = {
  kind: MentionKind
  subreddit: string
  title: string
  text: string
  author: string
  score: number
  permalink: string
  /** ISO-8601 timestamp when the post/comment was created. */
  createdAt: string
  sentiment: SentimentLabel
  sentimentScore: number
}

export type StockAnalysis = {
  symbol: string
  mentionCount: number
  sentimentScore: number
  sentimentLabel: SentimentLabel
  mentions: StockMention[]
}

export type AnalyzeStocksRsp = {
  analyzedAt: string
  subreddits: string[]
  stocks: StockAnalysis[]
}

/** Subreddits scraped for Indian equity discussion. */
export const TARGET_SUBREDDITS = [
  'IndianStreetBets',
  'IndianStockMarket',
  'DalalStreetTalk',
] as const

export const DEFAULT_STOCKS = [
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'ICICIBANK',
  'SBIN',
  'BHARTIARTL',
  'ITC',
  'LT',
  'WIPRO',
]
