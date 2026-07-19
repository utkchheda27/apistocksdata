import {fetchRecentComments, fetchRecentPosts, pause} from './reddit.ts'
import {aggregateSentiment, scoreSentiment} from './sentiment.ts'
import {
  type AnalyzeStocksRsp,
  type StockAnalysis,
  type StockMention,
  TARGET_SUBREDDITS,
} from './types.ts'

const RECENT_LIMIT = 100
const MAX_MENTIONS_PER_STOCK = 40

type ScrapedItem = {
  kind: 'post' | 'comment'
  subreddit: string
  title: string
  text: string
  author: string
  score: number
  permalink: string
  createdAt: Date
  haystack: string
}

/** Normalize user input into uppercase ticker-like symbols. */
export function normalizeStocks(raw: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const symbol = item
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.&-]/g, '')
    if (!symbol || seen.has(symbol)) continue
    seen.add(symbol)
    out.push(symbol)
    if (out.length >= 10) break
  }
  return out
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Whole-word / ticker match; allows $TICKER and NSE:TICKER forms. */
export function matchesStock(haystack: string, symbol: string): boolean {
  const pat = new RegExp(
    `(?:^|[^A-Za-z0-9])(?:\\$|NSE:|BSE:)?${escapeRegex(symbol)}(?:[^A-Za-z0-9]|$)`,
    'i',
  )
  return pat.test(haystack)
}

function snippetAround(text: string, symbol: string, maxLen = 220): string {
  const lower = text.toLowerCase()
  const idx = lower.indexOf(symbol.toLowerCase())
  if (idx < 0) {
    return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`
  }
  const start = Math.max(0, idx - 60)
  const end = Math.min(text.length, idx + symbol.length + 120)
  let snip = text.slice(start, end).trim()
  if (start > 0) snip = `…${snip}`
  if (end < text.length) snip = `${snip}…`
  return snip
}

async function scrapeSubreddit(subredditName: string): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = []

  const posts = await fetchRecentPosts(subredditName, RECENT_LIMIT)
  await pause(300)
  for (const post of posts) {
    items.push({
      kind: 'post',
      subreddit: subredditName,
      title: post.title,
      text: post.body || post.title,
      author: post.author,
      score: post.score,
      permalink: post.permalink,
      createdAt: post.createdAt,
      haystack: `${post.title}\n${post.body}`,
    })
  }

  const comments = await fetchRecentComments(subredditName, RECENT_LIMIT)
  await pause(300)
  for (const comment of comments) {
    items.push({
      kind: 'comment',
      subreddit: subredditName,
      title: '',
      text: comment.body,
      author: comment.author,
      score: comment.score,
      permalink: comment.permalink,
      createdAt: comment.createdAt,
      haystack: comment.body,
    })
  }

  return items
}

export async function analyzeStocks(
  stocks: string[],
): Promise<AnalyzeStocksRsp> {
  const symbols = normalizeStocks(stocks)
  if (symbols.length === 0) {
    return {
      analyzedAt: new Date().toISOString(),
      subreddits: [...TARGET_SUBREDDITS],
      stocks: [],
    }
  }

  const scraped: ScrapedItem[] = []
  for (const sub of TARGET_SUBREDDITS) {
    try {
      console.log(`Scraping r/${sub} (posts + comments)…`)
      const items = await scrapeSubreddit(sub)
      scraped.push(...items)
      const posts = items.filter(i => i.kind === 'post').length
      const comments = items.filter(i => i.kind === 'comment').length
      console.log(`  → ${posts} posts, ${comments} comments`)
    } catch (err) {
      console.error(`scrape failed for r/${sub}: ${err}`)
    }
  }

  const stocksOut: StockAnalysis[] = symbols.map(symbol => {
    const mentions: StockMention[] = []

    for (const item of scraped) {
      if (!matchesStock(item.haystack, symbol)) continue
      const {score, label} = scoreSentiment(item.haystack)
      mentions.push({
        kind: item.kind,
        subreddit: item.subreddit,
        title: item.title,
        text: snippetAround(item.text, symbol),
        author: item.author,
        score: item.score,
        permalink: item.permalink,
        createdAt: item.createdAt.toISOString(),
        sentiment: label,
        sentimentScore: score,
      })
    }

    mentions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    const trimmed = mentions.slice(0, MAX_MENTIONS_PER_STOCK)
    const agg = aggregateSentiment(trimmed.map(m => m.sentimentScore))

    return {
      symbol,
      mentionCount: mentions.length,
      sentimentScore: Number(agg.score.toFixed(3)),
      sentimentLabel: agg.label,
      mentions: trimmed,
    }
  })

  return {
    analyzedAt: new Date().toISOString(),
    subreddits: [...TARGET_SUBREDDITS],
    stocks: stocksOut,
  }
}
