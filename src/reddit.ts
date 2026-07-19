const USER_AGENT =
  process.env.REDDIT_USER_AGENT ??
  'apistocksdata/1.0 (personal stock sentiment digest)'

const ARCTIC_BASE =
  process.env.ARCTIC_SHIFT_BASE?.replace(/\/$/, '') ??
  'https://arctic-shift.photon-reddit.com'

type ArcticPost = {
  id: string
  title?: string
  selftext?: string
  author?: string
  score?: number
  permalink?: string
  created_utc: number
  num_comments?: number
  subreddit?: string
}

type ArcticComment = {
  id?: string
  body?: string
  author?: string
  score?: number
  permalink?: string
  created_utc: number
  subreddit?: string
  link_id?: string
}

export type RedditPost = {
  id: string
  title: string
  body: string
  author: string
  score: number
  permalink: string
  createdAt: Date
  numComments: number
  subreddit: string
}

export type RedditComment = {
  body: string
  author: string
  score: number
  permalink: string
  createdAt: Date
  subreddit: string
}

async function arcticFetch<T>(path: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${ARCTIC_BASE}${path}`
  const rsp = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  })
  if (!rsp.ok) {
    const text = await rsp.text().catch(() => '')
    throw new Error(
      `Arctic Shift HTTP ${rsp.status} for ${url}: ${text.slice(0, 200)}`,
    )
  }
  return (await rsp.json()) as T
}

function toPermalink(path: string | undefined): string {
  if (!path) return 'https://www.reddit.com'
  if (path.startsWith('http')) return path
  return `https://www.reddit.com${path.startsWith('/') ? path : `/${path}`}`
}

function mapPost(p: ArcticPost, fallbackSub: string): RedditPost {
  return {
    id: p.id,
    title: p.title ?? '',
    body: p.selftext ?? '',
    author: p.author ?? '[deleted]',
    score: p.score ?? 0,
    permalink: toPermalink(p.permalink),
    createdAt: new Date(p.created_utc * 1000),
    numComments: p.num_comments ?? 0,
    subreddit: p.subreddit ?? fallbackSub,
  }
}

function mapComment(c: ArcticComment, fallbackSub: string): RedditComment {
  return {
    body: c.body ?? '',
    author: c.author ?? '[deleted]',
    score: c.score ?? 0,
    permalink: toPermalink(c.permalink),
    createdAt: new Date(c.created_utc * 1000),
    subreddit: c.subreddit ?? fallbackSub,
  }
}

/** Recent posts in a subreddit (no Reddit API key needed). */
export async function fetchRecentPosts(
  subreddit: string,
  limit = 100,
): Promise<RedditPost[]> {
  const path = `/api/posts/search?subreddit=${encodeURIComponent(subreddit)}&limit=${limit}&sort_type=created_utc&sort=desc`
  const json = await arcticFetch<{data: ArcticPost[]}>(path)
  return (json.data ?? []).map(p => mapPost(p, subreddit))
}

/** Recent comments in a subreddit. */
export async function fetchRecentComments(
  subreddit: string,
  limit = 100,
): Promise<RedditComment[]> {
  const path = `/api/comments/search?subreddit=${encodeURIComponent(subreddit)}&limit=${limit}&sort_type=created_utc&sort=desc`
  const json = await arcticFetch<{data: ArcticComment[] | null}>(path)
  return (json.data ?? [])
    .filter(c => c.body && c.author !== '[deleted]' && c.body !== '[removed]')
    .map(c => mapComment(c, subreddit))
}

export function pause(ms = 400): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
