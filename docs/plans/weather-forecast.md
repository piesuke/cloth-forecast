# 都道府県と日付による天気予報：実装計画

## 目的と範囲

利用者が都道府県と日本時間の日付を選び、その都道府県の県庁所在地について、外出時間帯の1時間ごとの天気区分・気温（℃）・相対湿度（%）を確認できるようにする。服装提案は今回の対象に含めない。

選択できる日付は今日から14日後まで。今日なら現在以降の最初の毎正時から24時まで、明日以降なら9時から24時まで、両端を含めて取得する。24時は翌日00:00の予報を意味する。例えば現在が15:00なら今日の15:00から、15:01なら16:00から取得する。

Open-Meteoの予報は今日を含む16暦日分なので、15日目（今日から14日後）の24時は16日目の00:00として取得できる。過去の日付と15日目より後の日付は受け付けない。

## 境界

```text
UI（都道府県・日付の入力と時間別結果の表示）
  → TanStack Startサーバー関数（秘密ヘッダーを付与）
  → 天気APIハンドラー（認証・入力検証・レスポンス整形）
  → 天気取得サービス（代表地点の解決・Open-Meteo呼び出し・区分変換）
```

`GET /api/weather` は同じAPIハンドラーを使うHTTPルートとして用意する。サーバー関数からの呼び出しはプロセス内で行い、同じWorkerへのネットワーク `fetch` は使わない。詳細は [ADR 0001](../adr/0001-single-worker-weather-api-boundary.md)。

## API契約

- 入力：`prefecture` は47都道府県の正式名称、`date` は日本時間の暦日（`YYYY-MM-DD`）。時刻は入力させない。
- 認証：`X-Internal-API-Key` ヘッダーとサーバー側の秘密文字列を照合する。秘密文字列はCloudflare WorkersのSecretに設定し、ローカル開発ではGit管理外の `.dev.vars` に置く。`.gitignore` にも `.dev.vars*` を追加する。未設定なら設定エラーとする。
- 成功応答：`prefecture`、`location`（県庁所在地名）、`date`、`hours` を返す。`hours` は時刻順の配列で、各要素は実際のISO日時、対象日の表示時刻（`HH:00`。終了時刻は`24:00`）、`weather`（`晴れ | 曇り | 雨 | 雪`）、`temperatureCelsius`、`relativeHumidityPercent` を持つ。24時のISO日時は翌日00:00。
- エラー：認証不一致、都道府県・日付の形式や範囲の不正、Open-Meteoの障害や必要値の欠落を区別し、UIには日本語で再入力または再試行を案内する。秘密文字列や上流レスポンスの詳細は返さない。

## データ取得

1. 47都道府県から県庁所在地名・緯度・経度を引く固定の対応表を作る。地名検索APIは毎回呼ばない。
2. サーバー側で日本時間の現在時刻から取得開始時刻と終了時刻を決める。今日の開始は現在以降の最初の毎正時、明日以降は9:00、終了はいずれも翌日00:00。開始・終了の両端を含む。
3. Open-Meteo Forecast APIへ、緯度・経度、`timezone=Asia/Tokyo`、`forecast_days=16`、`hourly=weather_code,temperature_2m,relative_humidity_2m`、算出した `start_hour` と `end_hour` を渡す。要求した時刻がすべて揃い、同時刻の必要値が欠けていないことを検証する。
4. WMO天気コードを4区分に変換する。霧は曇り、雷雨は雨、みぞれは雪に寄せる。未対応コードや欠測値は推測で埋めず、取得失敗として扱う。

## UI

- 都道府県の選択欄と、日本時間で今日から14日後までを選べる日付入力を置く。時刻入力は置かない。
- 送信中、入力エラー、取得失敗、時間別の結果をそれぞれ表示する。24時は対象日の「24:00」と表示し、代表地点が県庁所在地であることを明示する。
- 画面からOpen-Meteoや秘密ヘッダーへ直接アクセスしない。

## 実装順と確認

1. 都道府県の対応表と対象日の時間帯・天気区分の変換を作る。
2. Open-Meteoアダプターと天気取得サービスを作る。
3. 認証付きAPIハンドラー、HTTPルート、サーバー関数を作る。
4. 日付入力画面と時間別結果表示を作る。
5. 47都道府県、今日の正時前後、24時、14日後の境界、天気コードの分類、認証拒否、上流の失敗を確認する。ビルドと型・Lintチェックを通し、開発環境で実際のAPI取得を確認する。

## 参照

- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [TanStack Start Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [TanStack Start Server Routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes)
- [Cloudflare WorkersのWorker間通信](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare WorkersのSecret](https://developers.cloudflare.com/workers/vite-plugin/reference/secrets/)
