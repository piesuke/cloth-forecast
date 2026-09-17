export type Weather = '晴れ' | '曇り' | '雨' | '雪'
export type WeatherHour = {
  isoDatetime: string
  time: string
  weather: Weather
  temperatureCelsius: number
  relativeHumidityPercent: number
}
export type WeatherForecast = {
  prefecture: string
  location: string
  date: string
  hours: WeatherHour[]
}

export class WeatherError extends Error {
  constructor(
    public code: 'INVALID_INPUT' | 'UPSTREAM_FAILURE' | 'CONFIGURATION_ERROR',
  ) {
    super(code)
  }
}

const dayMs = 86_400_000
const tokyoOffsetMs = 9 * 3_600_000

export function tokyoToday(now: Date): string {
  return new Date(now.getTime() + tokyoOffsetMs).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * dayMs)
    .toISOString()
    .slice(0, 10)
}

export function validateDate(date: string, now: Date): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
    date < tokyoToday(now) ||
    date > addDays(tokyoToday(now), 14)
  ) {
    throw new WeatherError('INVALID_INPUT')
  }
}

export function requestedHours(date: string, now: Date): string[] {
  validateDate(date, now)
  const tokyoNow = new Date(now.getTime() + tokyoOffsetMs)
  const firstHour =
    date === tokyoToday(now)
      ? tokyoNow.getUTCHours() +
        (tokyoNow.getUTCMinutes() ||
        tokyoNow.getUTCSeconds() ||
        tokyoNow.getUTCMilliseconds()
          ? 1
          : 0)
      : 9
  const hours: string[] = []
  for (let hour = firstHour; hour <= 24; hour++) {
    hours.push(
      hour === 24
        ? `${addDays(date, 1)}T00:00`
        : `${date}T${String(hour).padStart(2, '0')}:00`,
    )
  }
  return hours
}

export function classifyWeather(code: number): Weather {
  if ([0, 1].includes(code)) return '晴れ'
  if ([2, 3, 45, 48].includes(code)) return '曇り'
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code))
    return '雨'
  if ([56, 57, 66, 67, 71, 73, 75, 77, 85, 86].includes(code)) return '雪'
  throw new WeatherError('UPSTREAM_FAILURE')
}
