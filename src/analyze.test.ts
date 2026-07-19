import assert from 'node:assert/strict'
import {test} from 'node:test'
import {matchesStock, normalizeStocks} from './analyze.ts'
import {aggregateSentiment, scoreSentiment} from './sentiment.ts'
import {formatTelegramMessages} from './telegram.ts'
import type {AnalyzeStocksRsp} from './types.ts'

test('normalize stocks: trim, upper, dedupe, cap at 10', () => {
  assert.deepEqual(
    normalizeStocks([' reliance ', 'TCS', 'tcs', 'INFY', '', '!!!']),
    ['RELIANCE', 'TCS', 'INFY'],
  )
  const ten = normalizeStocks([
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
  ])
  assert.equal(ten.length, 10)
})

test('matches stock tickers', () => {
  assert.equal(matchesStock('Bought RELIANCE today', 'RELIANCE'), true)
  assert.equal(matchesStock('NSE:TCS looking strong', 'TCS'), true)
  assert.equal(matchesStock('$INFY calls', 'INFY'), true)
  assert.equal(matchesStock('not related', 'TCS'), false)
})

test('sentiment scoring', () => {
  assert.equal(scoreSentiment('strong buy breakout rally').label, 'bullish')
  assert.equal(scoreSentiment('sell dump crash exit').label, 'bearish')
  assert.equal(scoreSentiment('just holding for now').label, 'neutral')
  assert.equal(aggregateSentiment([0.5, 0.5, 0]).label, 'bullish')
})

test('telegram formatter splits long payloads', () => {
  const data: AnalyzeStocksRsp = {
    analyzedAt: new Date().toISOString(),
    subreddits: ['IndianStreetBets'],
    stocks: [
      {
        symbol: 'RELIANCE',
        mentionCount: 0,
        sentimentScore: 0,
        sentimentLabel: 'neutral',
        mentions: [],
      },
    ],
  }
  const msgs = formatTelegramMessages(data)
  assert.equal(msgs.length, 1)
  assert.match(msgs[0] ?? '', /RELIANCE/)
})
