import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { addDays, tokyoToday, type WeatherForecast } from '../weather/domain'
import { prefectures } from '../weather/prefectures'
import { loadWeather } from '../weather/weather.functions'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [prefecture, setPrefecture] = useState('東京都')
  const [date, setDate] = useState(() => tokyoToday(new Date()))
  const [forecast, setForecast] = useState<WeatherForecast | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const today = tokyoToday(new Date())

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setForecast(null)
    setPending(true)
    try {
      const result = await loadWeather({ data: { prefecture, date } })
      if (result.forecast) setForecast(result.forecast)
      else
        setError(
          result.error ??
            '天気予報を取得できませんでした。再試行してください。',
        )
    } catch {
      setError('天気予報を取得できませんでした。再試行してください。')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="page">
      <div className="content">
        <header className="hero">
          <p className="eyebrow">衣装予報</p>
          <h1>お出かけの日の天気を、時間ごとに。</h1>
          <p>
            都道府県と日付を選ぶと、県庁所在地の1時間ごとの天気を確認できます。
          </p>
        </header>
        <form className="weather-form" onSubmit={submit}>
          <label>
            都道府県
            <select
              value={prefecture}
              onChange={(event) => setPrefecture(event.target.value)}
            >
              {Object.keys(prefectures).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            日付（日本時間）
            <input
              type="date"
              value={date}
              min={today}
              max={addDays(today, 14)}
              required
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <button type="submit" disabled={pending}>
            {pending ? '取得中…' : '天気を見る'}
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {forecast && (
          <section className="forecast" aria-live="polite">
            <div className="forecast-heading">
              <div>
                <p className="eyebrow">時間別の天気</p>
                <h2>
                  {forecast.date} · {forecast.prefecture}
                </h2>
              </div>
              <p>代表地点：県庁所在地の{forecast.location}</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">時刻</th>
                    <th scope="col">天気</th>
                    <th scope="col">気温</th>
                    <th scope="col">湿度</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.hours.map((hour) => (
                    <tr key={hour.isoDatetime}>
                      <th scope="row">{hour.time}</th>
                      <td>{hour.weather}</td>
                      <td>{hour.temperatureCelsius}℃</td>
                      <td>{hour.relativeHumidityPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="footnote">
              24:00 は翌日の 00:00
              の予報です。予報は都道府県全域ではなく代表地点の値です。
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
