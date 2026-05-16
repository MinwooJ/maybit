# Phase 0 — Discord 웹훅 알림 설정

봇 시작/종료/에러 등 운영 이벤트를 Discord 채널에 푸시한다. 추후 Phase 2부터는 신호 발생/가상 진입/청산/일일 요약도 같은 채널로.

---

## 1. Discord 서버 + 채널 준비

본인 서버가 없다면 새로 생성 (Discord 앱 → 좌측 `+` → "내가 만들기"). 봇 알림 전용 채널을 따로 만들기를 권장:

- 채널 이름 예: `#maybit-ops`
- 권한: 본인만 보이도록 비공개 채널로 (다른 멤버 없으면 기본 OK)

---

## 2. Webhook URL 발급

1. 해당 채널 우클릭 → **채널 편집** → **연동(Integrations)** → **웹훅(Webhooks)** → **새 웹훅**
2. 이름: `maybit`
3. **웹훅 URL 복사** 버튼 → 클립보드에 복사됨

URL 형식:
```
https://discord.com/api/webhooks/<id>/<token>
```

⚠️ 이 URL은 사실상 비밀번호. 노출되면 누구나 그 채널에 글 쓸 수 있음. **절대 git에 커밋 금지** (이미 `.env`는 `.gitignore` 처리됨).

---

## 3. 봇에 등록

### 3-1. 로컬 개발

```bash
cp bot/.env.example bot/.env
$EDITOR bot/.env
```

`DISCORD_WEBHOOK_URL` 줄에 복사한 URL 붙여넣기:

```dotenv
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123.../abc...
```

### 3-2. Oracle VM (프로덕션)

VM 안에서:

```bash
sudo $EDITOR /opt/maybit/bot/.env
```

같은 줄 추가 후 저장. 봇 재시작:

```bash
sudo systemctl restart maybit-bot
```

systemd가 `EnvironmentFile=/opt/maybit/bot/.env`를 자동 로드.

---

## 4. 동작 검증

봇 실행 시 Discord 채널에 다음 형식의 임베드가 와야 함:

> **🟢 maybit bot started**
> mode: paper
> KRW markets: 260
> at (KST): 2026-05-16 21:00:00

종료(Ctrl+C 또는 `systemctl stop`)시:

> **🔴 maybit bot stopped**
> signal: SIGINT
> at (KST): 2026-05-16 21:05:00
> ticks received: 1234

오지 않으면 봇 로그 확인:

```bash
# 로컬
pnpm --filter @maybit/bot start | grep -i discord

# VM
journalctl -u maybit-bot -f | grep -i discord
```

자주 보이는 메시지:
- `discord disabled (DISCORD_WEBHOOK_URL not set)` → 환경변수 로드 안 됨. `.env` 위치/내용 확인.
- `discord send failed` (status: 401/404) → URL 잘못됨. 재발급.
- `discord send failed` (status: 429) → Rate limit. 봇 측에 throttle 필요 (Phase 1).

---

## 5. 알림 분류 (현재 / 향후)

| Phase | 이벤트 | 컬러 |
|---|---|---|
| 0 | 봇 시작/종료 | 🟢 success / 🟡 warn |
| 0 | bootstrap 실패 | 🔴 critical |
| 1 | WS 끊김/재연결 | 🟡 warn / 🟢 success |
| 2 | 신호 발생 | 🔵 info |
| 2 | 가상 진입/청산 | 🔵 info |
| 2 | 일일 요약 (KST 00:00) | 🔵 info |
| 3 | 실거래 진입/청산 | 🟢 success / 🟡 warn |
| 3 | Reconciler 불일치 | 🔴 critical |
| 3 | 일일/주간 손실 한도 도달 | 🔴 critical |

---

## 6. 운영 팁

- **여러 채널 분리**: 일상 알림 (`#maybit-ops`) vs 긴급 알림 (`#maybit-alerts`)으로 나누고 후자에는 `@everyone` 멘션을 붙여 푸시 강화. 별도 webhook URL 두 개 사용.
- **임베드 vs content**: 임베드는 시각적, content는 모바일 푸시 알림에 직접 노출. 긴급 경고는 `content`도 채울 것.
- **Rate limit**: Discord 웹훅은 채널당 약 5/2초. Phase 2+에서 신호 폭주 시 큐잉 필요. Phase 0 PoC는 lifecycle만 보내므로 무관.
- **개인 정보 노출 주의**: Discord 메시지에 API 키, 잔고 절대값 등 민감 정보 절대 포함하지 말 것. 손익 % 정도가 적절.
