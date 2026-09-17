import {
  classifyWeather,
  requestedHours,
  type WeatherForecast,
  WeatherError,
} from './domain'
import { isPrefecture, prefectures } from './prefectures'
import { fetchHourly } from './open-meteo.server'

export async function getWeatherForecast(
  prefecture: string,
  date: string,
  now = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<WeatherForecast> {
  if (!isPrefecture(prefecture)) throw new WeatherError('INVALID_INPUT')
  const hours = requestedHours(date, now)
  const place = prefectures[prefecture]
  const hourly = await fetchHourly(
    place.latitude,
    place.longitude,
    hours,
    fetcher,
  )
  if (
    hourly.time.length !== hours.length ||
    hourly.weather_code.length !== hours.length ||
    hourly.temperature_2m.length !== hours.length ||
    hourly.relative_humidity_2m.length !== hours.length
  ) {
    throw new WeatherError('UPSTREAM_FAILURE')
  }
  return {
    prefecture,
    location: place.location,
    date,
    hours: hours.map((time, index) => {
      const code = hourly.weather_code[index]
      const temperature = hourly.temperature_2m[index]
      const humidity = hourly.relative_humidity_2m[index]
      if (
        hourly.time[index] !== time ||
        !Number.isInteger(code) ||
        typeof temperature !== 'number' ||
        !Number.isFinite(temperature) ||
        typeof humidity !== 'number' ||
        !Number.isInteger(humidity) ||
        humidity < 0 ||
        humidity > 100
      ) {
        throw new WeatherError('UPSTREAM_FAILURE')
      }
      return {
        isoDatetime: `${time}+09:00`,
        time: time.slice(0, 10) === date ? time.slice(11) : '24:00',
        weather: classifyWeather(code),
        temperatureCelsius: temperature,
        relativeHumidityPercent: humidity,
      }
    }),
  }
}
