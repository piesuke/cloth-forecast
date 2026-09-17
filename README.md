# 衣装予報

都道府県と日本時間の日付を選ぶと、その県庁所在地の1時間ごとの天気・気温・相対湿度を表示します。今日から14日後まで選べます。今日の予報は現在以降の最初の毎正時から、明日以降は9時から、いずれも翌日0時（画面上は24:00）までです。

## ローカル開発

```bash
npm install
```

`.dev.vars` に `INTERNAL_API_KEY="十分に長いランダムな文字列"` を設定します。このファイルは Git 管理外です。設定後に次を実行します。

```bash
npx wrangler types
npm run dev
```

ブラウザーで `http://localhost:3000` を開きます。HTTP API を直接使う場合は `GET /api/weather?prefecture=東京都&date=YYYY-MM-DD` に `X-Internal-API-Key` ヘッダーを付けます。画面の呼び出しはサーバー関数が同じハンドラーへプロセス内で渡します。

## 検証とデプロイ

```bash
npx tsc --noEmit
npm run lint
npm run build
./node_modules/.bin/esbuild src/weather/weather.test.ts --bundle --platform=node --format=esm --outfile=/tmp/cloth-weather-test.mjs
node --test /tmp/cloth-weather-test.mjs
```

本番では `npx wrangler secret put INTERNAL_API_KEY` で同名の Secret を設定してから `npm run deploy` を実行します。

Open-Meteo の Forecast API は `forecast_days` と `start_hour` / `end_hour` の併用を拒否するため、要求する時間範囲のみを指定します。
