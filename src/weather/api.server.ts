import { WeatherError } from './domain'
import { getWeatherForecast } from './service.server'

const headerName = 'X-Internal-API-Key'

function sameSecret(actual: string, expected: string): boolean {
  const actualBytes = new TextEncoder().encode(actual)
  const expectedBytes = new TextEncoder().encode(expected)
  let difference = actualBytes.length ^ expectedBytes.length
  for (
    let index = 0;
    index < Math.max(actualBytes.length, expectedBytes.length);
    index++
  ) {
    difference |= (actualBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0)
  }
  return difference === 0
}

export async function handleWeatherRequest(
  request: Request,
  secret: string | undefined,
  now = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (!secret)
    return Response.json(
      {
        error: 'CONFIGURATION_ERROR',
        message: 'サーバーの設定を確認してください。',
      },
      { status: 500 },
    )
  if (!sameSecret(request.headers.get(headerName) ?? '', secret)) {
    return Response.json(
      { error: 'UNAUTHORIZED', message: '認証できませんでした。' },
      { status: 401 },
    )
  }
  const url = new URL(request.url)
  try {
    const forecast = await getWeatherForecast(
      url.searchParams.get('prefecture') ?? '',
      url.searchParams.get('date') ?? '',
      now,
      fetcher,
    )
    return Response.json(forecast)
  } catch (error) {
    if (error instanceof WeatherError && error.code === 'INVALID_INPUT') {
      return Response.json(
        {
          error: 'INVALID_INPUT',
          message: '都道府県と日付を選び直してください。',
        },
        { status: 400 },
      )
    }
    return Response.json(
      {
        error: 'UPSTREAM_FAILURE',
        message:
          '天気予報を取得できませんでした。しばらくしてから再試行してください。',
      },
      { status: 502 },
    )
  }
}

export function internalWeatherRequest(
  prefecture: string,
  date: string,
  secret: string,
): Request {
  const url = new URL('https://internal.invalid/api/weather')
  url.searchParams.set('prefecture', prefecture)
  url.searchParams.set('date', date)
  return new Request(url, { headers: { [headerName]: secret } })
}
