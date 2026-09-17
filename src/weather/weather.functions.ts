import { createServerFn } from '@tanstack/react-start'
import type { WeatherForecast } from './domain'

export const loadWeather = createServerFn({ method: 'GET' })
  .validator((input: { prefecture: string; date: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ forecast?: WeatherForecast; error?: string }> => {
      const { env } = await import('cloudflare:workers')
      const { handleWeatherRequest, internalWeatherRequest } = await import(
        './api.server'
      )
      const secret = env.INTERNAL_API_KEY
      const response = await handleWeatherRequest(
        internalWeatherRequest(data.prefecture, data.date, secret ?? ''),
        secret,
      )
      const result = (await response.json()) as
        | WeatherForecast
        | { message: string }
      return response.ok
        ? { forecast: result as WeatherForecast }
        : { error: (result as { message: string }).message }
    },
  )
