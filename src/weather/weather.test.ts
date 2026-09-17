import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addDays, classifyWeather, requestedHours, tokyoToday } from './domain'
import { prefectures } from './prefectures'
import { getWeatherForecast } from './service.server'
import { handleWeatherRequest, internalWeatherRequest } from './api.server'

const now = new Date('2026-09-17T06:00:00Z') // 15:00 in Japan
const today = tokyoToday(now)

function responseFor(times: string[], overrides: Record<string, unknown> = {}) {
  return Response.json({
    hourly: {
      time: times,
      weather_code: times.map(() => 0),
      temperature_2m: times.map(() => 20),
      relative_humidity_2m: times.map(() => 55),
      ...overrides,
    },
  })
}

test('all 47 prefectures resolve to a capital and coordinates', () => {
  assert.equal(Object.keys(prefectures).length, 47)
  for (const place of Object.values(prefectures)) {
    assert.ok(place.location)
    assert.ok(place.latitude >= 20 && place.latitude <= 46)
    assert.ok(place.longitude >= 122 && place.longitude <= 154)
  }
})

test('today begins at the current whole hour or the next one and includes midnight', () => {
  assert.equal(requestedHours(today, now)[0], `${today}T15:00`)
  assert.equal(
    requestedHours(today, new Date(now.getTime() + 60_000))[0],
    `${today}T16:00`,
  )
  assert.equal(
    requestedHours(today, new Date('2026-09-17T14:59:00Z'))[0],
    `${addDays(today, 1)}T00:00`,
  )
  assert.equal(requestedHours(today, now).at(-1), `${addDays(today, 1)}T00:00`)
})

test('future range includes day 14 and rejects earlier and later dates', () => {
  const lastDay = addDays(today, 14)
  assert.equal(requestedHours(lastDay, now)[0], `${lastDay}T09:00`)
  assert.equal(
    requestedHours(lastDay, now).at(-1),
    `${addDays(lastDay, 1)}T00:00`,
  )
  assert.throws(() => requestedHours(addDays(today, -1), now))
  assert.throws(() => requestedHours(addDays(today, 15), now))
  assert.throws(() => requestedHours('2026-02-30', now))
})

test('WMO codes map mist, storms and sleet as specified', () => {
  assert.equal(classifyWeather(0), '晴れ')
  assert.equal(classifyWeather(45), '曇り')
  assert.equal(classifyWeather(95), '雨')
  assert.equal(classifyWeather(66), '雪')
  assert.throws(() => classifyWeather(100))
})

test('forecast uses each expected timestamp and labels next midnight 24:00', async () => {
  const times = requestedHours(today, now)
  const fetcher = async (url: URL | RequestInfo) => {
    const query = new URL(String(url)).searchParams
    assert.equal(query.get('start_hour'), times[0])
    assert.equal(query.get('end_hour'), times.at(-1))
    assert.equal(query.get('forecast_days'), null)
    return responseFor(times)
  }
  const forecast = await getWeatherForecast(
    '東京都',
    today,
    now,
    fetcher as typeof fetch,
  )
  assert.equal(forecast.location, '新宿区')
  assert.equal(forecast.hours.at(-1)?.time, '24:00')
  assert.equal(
    forecast.hours.at(-1)?.isoDatetime,
    `${addDays(today, 1)}T00:00+09:00`,
  )
})

test('missing hours and values fail instead of being filled', async () => {
  const times = requestedHours(today, now)
  await assert.rejects(
    getWeatherForecast('東京都', today, now, (async () =>
      responseFor(times.slice(1))) as typeof fetch),
  )
  await assert.rejects(
    getWeatherForecast('東京都', today, now, (async () =>
      responseFor(times, {
        relative_humidity_2m: times.map(() => null),
      })) as typeof fetch),
  )
})

test('API distinguishes missing configuration, invalid auth, invalid input and upstream failure', async () => {
  const request = internalWeatherRequest('東京都', today, 'secret')
  assert.equal(
    (await handleWeatherRequest(request, undefined, now)).status,
    500,
  )
  assert.equal((await handleWeatherRequest(request, 'other', now)).status, 401)
  assert.equal(
    (
      await handleWeatherRequest(
        internalWeatherRequest('東京', today, 'secret'),
        'secret',
        now,
      )
    ).status,
    400,
  )
  assert.equal(
    (
      await handleWeatherRequest(
        request,
        'secret',
        now,
        (async () => new Response(null, { status: 503 })) as typeof fetch,
      )
    ).status,
    502,
  )
})
