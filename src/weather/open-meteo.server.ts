import { WeatherError } from './domain'

type HourlyData = {
  time: string[]
  weather_code: number[]
  temperature_2m: number[]
  relative_humidity_2m: number[]
}

export async function fetchHourly(
  latitude: number,
  longitude: number,
  hours: string[],
  fetcher: typeof fetch = fetch,
): Promise<HourlyData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('timezone', 'Asia/Tokyo')
  url.searchParams.set(
    'hourly',
    'weather_code,temperature_2m,relative_humidity_2m',
  )
  url.searchParams.set('start_hour', hours[0])
  url.searchParams.set('end_hour', hours[hours.length - 1])
  let response: Response
  try {
    response = await fetcher(url)
  } catch {
    throw new WeatherError('UPSTREAM_FAILURE')
  }
  if (!response.ok) throw new WeatherError('UPSTREAM_FAILURE')
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new WeatherError('UPSTREAM_FAILURE')
  }
  if (!body || typeof body !== 'object' || !('hourly' in body))
    throw new WeatherError('UPSTREAM_FAILURE')
  const hourly = body.hourly as Partial<HourlyData> | null
  if (
    !hourly ||
    !Array.isArray(hourly.time) ||
    !Array.isArray(hourly.weather_code) ||
    !Array.isArray(hourly.temperature_2m) ||
    !Array.isArray(hourly.relative_humidity_2m)
  ) {
    throw new WeatherError('UPSTREAM_FAILURE')
  }
  return hourly as HourlyData
}
