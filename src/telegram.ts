import type {AnalyzeStocksRsp, StockAnalysis} from './types.ts'

const TELEGRAM_MAX = 3900

function sentimentIcon(label: string): string {
  if (label === 'bullish') return '🟢'
  if (label === 'bearish') return '🔴'
  return '⚪'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatStockBlock(stock: StockAnalysis): string {
  const head = `${sentimentIcon(stock.sentimentLabel)} ${stock.symbol} — ${stock.mentionCount} mention${stock.mentionCount === 1 ? '' : 's'} · ${stock.sentimentLabel} (${stock.sentimentScore.toFixed(2)})`

  if (stock.mentions.length === 0) {
    return `${head}\nNo recent mentions\n`
  }

  const lines = stock.mentions.slice(0, 6).map(m => {
    const when = formatTime(m.createdAt)
    const snip = m.text.replace(/\s+/g, ' ').slice(0, 160)
    return `• [${m.kind}] r/${m.subreddit} @ ${when}\n  ${snip}\n  ${m.permalink}`
  })

  return `${head}\n${lines.join('\n')}\n`
}

/** Build one or more Telegram plain-text messages (under length limit). */
export function formatTelegramMessages(data: AnalyzeStocksRsp): string[] {
  const header = [
    'Indian Stocks Pulse',
    `Scanned: ${formatTime(data.analyzedAt)} IST`,
    `Sources: ${data.subreddits.map(s => `r/${s}`).join(', ')}`,
    '',
  ].join('\n')

  const blocks = data.stocks.map(formatStockBlock)
  const messages: string[] = []
  let current = header

  for (const block of blocks) {
    if (current.length + block.length + 1 > TELEGRAM_MAX) {
      messages.push(current.trimEnd())
      current = `${header}(continued)\n\n${block}`
    } else {
      current += `${block}\n`
    }
  }
  if (current.trim()) messages.push(current.trimEnd())
  return messages
}

export async function sendTelegramMessages(messages: string[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()

  if (!token || !chatId) {
    throw new Error(
      'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env (see .env.example)',
    )
  }

  for (const text of messages) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const rsp = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    })
    if (!rsp.ok) {
      const body = await rsp.text().catch(() => '')
      throw new Error(`Telegram HTTP ${rsp.status}: ${body.slice(0, 300)}`)
    }
  }
}
