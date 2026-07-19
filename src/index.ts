#!/usr/bin/env -S node --experimental-strip-types --no-warnings=ExperimentalWarning
import {analyzeStocks, normalizeStocks} from './analyze.ts'
import {formatTelegramMessages, sendTelegramMessages} from './telegram.ts'
import {DEFAULT_STOCKS} from './types.ts'

function resolveStocks(argv: string[]): string[] {
  const fromCli = argv.filter(a => !a.startsWith('--'))
  if (fromCli.length > 0) return normalizeStocks(fromCli)

  const fromEnv = process.env.STOCKS?.split(/[\n,]+/) ?? []
  const normalized = normalizeStocks(fromEnv)
  return normalized.length > 0 ? normalized : DEFAULT_STOCKS
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const stocks = resolveStocks(argv)

  console.log(`Watchlist (${stocks.length}): ${stocks.join(', ')}`)
  if (dryRun) console.log('Dry run — will print digest, skip Telegram')

  const result = await analyzeStocks(stocks)
  const messages = formatTelegramMessages(result)

  if (dryRun) {
    for (const msg of messages) {
      console.log('\n──────── Telegram message ────────')
      console.log(msg)
    }
    console.log(`\nDone (dry-run). ${messages.length} message(s).`)
    return
  }

  console.log('Sending to Telegram…')
  await sendTelegramMessages(messages)
  console.log(`Done. Sent ${messages.length} message(s) to your chat.`)
}

try {
  await main()
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
}
