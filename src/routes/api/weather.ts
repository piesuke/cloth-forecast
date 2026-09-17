import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { handleWeatherRequest } from '../../weather/api.server'

export const Route = createFileRoute('/api/weather')({
  server: {
    handlers: {
      GET: ({ request }) => handleWeatherRequest(request, env.INTERNAL_API_KEY),
    },
  },
})
