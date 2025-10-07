import { strict as assert } from 'node:assert'
import test from 'node:test'
import { determineTimerVariant, formatMinutesToClock } from './dist/utils/time.js'

test('determineTimerVariant thresholds', () => {
  assert.equal(determineTimerVariant(10), 'normal')
  assert.equal(determineTimerVariant(25), 'warning')
  assert.equal(determineTimerVariant(34.9), 'warning')
  assert.equal(determineTimerVariant(35), 'priority')
})

test('formatMinutesToClock outputs mm:ss', () => {
  assert.equal(formatMinutesToClock(0), '00:00')
  assert.equal(formatMinutesToClock(1.5), '01:30')
  assert.equal(formatMinutesToClock(35.2), '35:12')
})
