# maybit — 자동매매 봇 기획서

> 최종 갱신: 2026-05-16
> 본 문서는 모든 핵심 결정의 단일 진실 공급원(Single Source of Truth)이다. 변경 시 이 문서를 먼저 업데이트한다.

---

## 1. 목표

업비트(Upbit) **KRW 마켓**에서 1~5분봉 기반 **단타 급등 포착** 전략을 자동 실행하는 봇과, 투자 현황을 보고 파라미터를 조정할 수 있는 대시보드/어드민을 운영한다.

### 성공 기준 (현실적)
- 페이퍼 → 10만원 실거래 → 100만원 실거래로 점진 확대
- 월 단위 손익 **+1~3% 또는 본전 유지**를 합리적 기대치로 설정 (월 +10% 같은 환상 금지)
- 가장 중요한 성공 조건은 **자본 보호** (3중 안전망 무결성 / 보호 종목 무사고)

---

## 2. 확정 결정 사항

| 항목 | 결정 |
|---|---|
| 거래소 | Upbit (KRW 마켓, 현물) |
| 매매 주기 | 1~5분봉 + **WebSocket 실시간 틱 트리거** |
| 시작 방식 | (b) 페이퍼 트레이딩 → 10만원 → 100만원 |
| 봇 호스팅 | **Oracle Cloud Always Free (ARM Ampere A1)** |
| 대시보드 호스팅 | **Cloudflare Pages** (Next.js) |
| 언어 | **TypeScript (Node.js 22 LTS)** — 전체 통일 |
| 대시보드 프레임워크 | **Next.js 15 (App Router)** + Auth.js |
| 어드민 인증 | **GitHub OAuth** (허용 사용자: `MinwooJ` only) |
| 알림 | **Discord 웹훅** |
| 거래당 위험 | **자본의 0.5% 고정** (위험 기반 사이징) |
| 전략 | **단일 전략 A — Box Breakout** (단순할수록 디버깅 쉽다) |
| 레포 구조 | **Monorepo** (`bot/`, `dashboard/`, `shared/`) |
| Worker 분리 | ❌ — Next.js API Routes가 BFF 겸용 |

---

## 3. 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                          UPBIT EXCHANGE                          │
│  WebSocket (시세/체결/내주문)        REST API (주문/잔고/캔들)  │
└──────────────┬─────────────────────────────────┬─────────────────┘
               │ subscribe                       │ HTTPS+JWT
               ▼                                 ▲
┌─────────────────────────────────────────────────────────────────┐
│           ORACLE CLOUD ARM VM (Always Free, 24/7)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              BOT CORE (Node.js + TypeScript)             │   │
│  │  WS Manager → Market Data Cache → Strategy Engine        │   │
│  │     → RISK GUARD (7중 검문) → Position Manager           │   │
│  │     → Order Executor → REST Rate Limiter                 │   │
│  │  + Reconciler (1분 주기 잔고 ↔ 원장 검증)                │   │
│  └──────┬──────────────────────────────────────┬────────────┘   │
│         ▼                                       ▼                │
│  SQLite (better-sqlite3)               Internal HTTP API (Hono)  │
│                                        Bearer 인증, HTTPS via    │
│                                        Caddy 리버스 프록시       │
└────────────────────────────────────────────┬─────────────────────┘
                                             │
┌────────────────────────────────────────────▼─────────────────────┐
│                     CLOUDFLARE PAGES                              │
│  Next.js 15 (App Router) + shadcn/ui + lightweight-charts        │
│   - GitHub OAuth (Auth.js)                                       │
│   - 대시보드: 포지션, 손익곡선, 신호 로그, 일일 통계             │
│   - 어드민: 전략 파라미터, KILL_SWITCH, protected_coins          │
│   - API Routes로 봇 API 프록시 (BFF 역할 통합)                  │
└──────────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ git push origin main
                ┌──────────────────┴──────────────────┐
                │  github.com/MinwooJ/maybit          │
                │  ├── bot/         → SSH to Oracle   │
                │  ├── dashboard/   → CF Pages        │
                │  ├── shared/      → TS types/Zod    │
                │  └── docs/                          │
                └─────────────────────────────────────┘
```

### 데이터 플로우 (정상 매매 1사이클)
1. WS `trade` 스트림 → Strategy: 박스 돌파 조건 충족 감지
2. Strategy → Risk Guard: 진입 신호 발행
3. Risk Guard: 7중 검문 (protected? 자본 캡? 동시보유? 쿨다운? BTC 급락? 손실 한도? KILL?)
4. 통과 → Position Manager: 위험 0.5% 기반 수량 산출
5. Order Executor → Upbit REST `POST /v1/orders` (시장가 매수)
6. WS `myOrder`: 체결 알림 수신 → `bot_positions` 원장 업데이트 → Discord 알림
7. Position Manager: 손절/익절 모니터링 시작 (틱 단위)
8. 청산 조건 충족 → 시장가 매도 → 체결 알림 → 원장 정리 → 손익 기록

---

## 4. 전략: Box Breakout A

### 종목 유니버스 (매 5분 갱신)
- KRW 마켓 전 종목 대상
- **24h 거래대금 ≥ 200억 원** (유동성 확보)
- 업비트 유의/주의/거래량 급등 경보 종목 **제외**
- 신규 상장 후 24시간 미경과 종목 **제외**
- 스테이블코인(USDT/USDC/DAI) **제외**
- **`protected_coins`에 등록된 종목 절대 제외**

### 시간/시장 필터
- 한국 시간 **03:00~06:00 거래 빈도 50% 축소** (유동성 저하 시간대)
- **BTC 5분봉 -2% 이상 급락** → 신규 진입 정지 + 보유 포지션 손절선 타이트닝 (현재가 -0.5%)
  - ⚠️ 시장가 일괄 청산 ❌ (플래시 크래시 바닥에서 매도하는 최악수)

### 진입 조건 (모두 충족)
- 직전 10×5m봉의 high-low 범위 < 1.5% (**박스 식별**)
- **실시간 가격이 박스 상단 초과** (WebSocket trade 스트림으로 즉시 감지)
- `RVOL ≥ 2.0` (현재 5분 거래량 / 최근 20봉 평균 거래량)
- `RSI(14)` 가속도 양수 (직전 5봉 평균 RSI보다 현재 RSI 높음)
- 15분봉 EMA50 위에 가격이 위치 (상위 시간프레임 트렌드 필터)

### 진입 사이즈 (위험 기반)
```
risk_krw   = bot_capital_krw × 0.005          // 자본의 0.5%
qty        = risk_krw / (entry_price - sl_price)
position_krw = min(qty × entry_price, max_position_krw)
```
- 어떤 변동성의 종목이든 손절 발생 시 자본의 **같은 % 손실**로 안정화
- 동시 보유 최대 **3 포지션**
- 같은 종목 청산 후 **30분 재진입 쿨다운**

### 청산 (ATR(14) 5분봉 기반)
- **손절(SL)**: 진입가 − ATR × 1.5
- **1차 익절(TP1)**: 진입가 + ATR × 2 → 포지션 **50% 청산**, SL을 BEP(본전)으로 이동
- **잔여 50% 트레일링**: `max(BEP, 현재가 − ATR × 1.5)` 동적 갱신
- **시간컷**: 진입 후 4시간 경과 시 시장가 청산

### 수수료/슬리피지 가정
- 업비트 KRW 마켓 0.05% × 2 (매수+매도) = 왕복 **0.1%** 수수료
- 시장가 슬리피지 0.1~0.3% (작은 알트는 0.5%까지)
- 백테스트는 보수적으로 **거래당 0.5% 페널티** 적용

---

## 5. 리스크 관리 / 안전장치

### 손실 한도
| 한도 | 트리거 | 행동 |
|---|---|---|
| 일일 손실 -5% | KST 자정 기준 누적 | 당일 신규 진입 정지 (보유는 정상 청산 룰 유지) |
| **롤링 7일 손실 -10%** | 최근 7일 누적 | 7일 거래 중단 + Discord critical 알림 |
| 2일 연속 손실 | | 1일 강제 휴식 |

### KILL_SWITCH
- 어드민 1클릭 토글
- ON: 모든 신규 진입 즉시 차단, 보유 포지션은 정상 SL/TP 룰 유지
- 봇 시작 시 KILL_SWITCH 상태 우선 확인 후 매매 진입

### API 키 권한
- **출금 권한 OFF 필수**
- Oracle VM 외부 IP를 화이트리스트로 지정
- 환경변수로만 보관 (`.env` 파일은 systemd EnvironmentFile)

---

## 6. 보호 종목 / 자기 자본 격리 (3중 안전망)

기존 보유 종목을 봇이 절대 건드리지 못하도록 **세 개 독립 레이어**를 둔다. 한 레이어 뚫려도 나머지가 막는다.

### Layer 1: 종목 블랙리스트
- `protected_coins` 테이블에 등록된 마켓 코드는 **진입 후보에서 무조건 제외**
- 봇 최초 실행 시 Upbit 계정 잔고 스캔 → 0 초과 보유 종목을 **자동 등록** (`reason = auto_initial_holding`)
- 어드민에서 수동 추가/삭제 가능 (audit_log 기록)

### Layer 2: 봇 소유 수량 원장
- `bot_positions` 테이블에 **봇이 매수한 수량만** 기록
- 매도 시 `min(bot_owned_qty, 매도 요청 수량)`만 처리 → 외부 보유는 절대 못 건드림
- **Reconciler (1분 주기)**:
  - Upbit 잔고 < 봇 원장 → 외부 매도 감지 → 원장 하향 + Discord 알림
  - Upbit 잔고 > 봇 원장 → 외부 매수 (정상, 봇은 무시)

### Layer 3: 하드 캡 (절대값)
- `bot_capital_krw`: 봇이 사용할 수 있는 KRW 총량 (예: 100만원)
- `max_position_krw`: 1포지션 최대 절대값 (예: 50만원)
- 잔고가 이 초과분은 보호 자본으로 간주, 봇은 인식조차 안 함

---

## 7. 데이터 모델 (SQLite + Drizzle ORM)

8개 테이블. 자세한 컬럼 정의는 `bot/db/schema.ts`에서 관리하며, 본 문서는 요약본.

| 테이블 | 역할 |
|---|---|
| `bot_positions` | 봇이 소유한 포지션 (open/closing/closed) |
| `trades` | 모든 주문 단위 원장 (Upbit 호출 + 멱등 client_order_id) |
| `signals` | 모든 전략 신호 로그 (거부된 것도 거부 이유와 함께 기록) |
| `protected_coins` | 절대 매매 금지 블랙리스트 |
| `config` | 단일 행 키-값, 모든 런타임 설정 |
| `daily_stats` | KST 일별 손익/통계 집계 |
| `audit_log` | 어드민 변경 이력 |
| `system_events` | WS 끊김/Rate limit/에러 등 운영 이벤트 |

### 인메모리만 유지 (DB 미저장)
- 1m/5m/15m/1h 롤링 OHLCV 버퍼 (재시작 시 REST candle로 200봉씩 재구축)
- 실시간 tick 스트림 (즉시 소비)
- 지표 누적값 (ATR, RSI, EMA, BB, RVOL 분모)

### `config` 키 목록
`kill_switch`, `mode`(paper|live), `bot_capital_krw`, `max_position_krw`, `risk_per_trade_pct`, `max_concurrent`, `daily_loss_pct`, `weekly_loss_pct`, `cooldown_min`, `btc_crash_threshold_pct`, `strategy_params`(JSON: `rvol_min`, `box_window`, `box_max_range_pct`, `rsi_accel_min`, `ema50_filter`, `atr_period`, `sl_atr_mult`, `tp1_atr_mult`, `trailing_atr_mult`, `time_cut_min`)

---

## 8. 기술 스택

### Bot (`/bot`, Oracle VM 24/7)
| 영역 | 선택 |
|---|---|
| 런타임 | Node.js 22 LTS (ARM64) |
| 언어 | TypeScript (`tsx` 또는 `tsc`) |
| WebSocket | `ws` |
| HTTP 서버 | `hono` |
| DB | `better-sqlite3` |
| ORM/마이그레이션 | `drizzle-orm` + `drizzle-kit` |
| 검증 스키마 | `zod` (shared/) |
| JWT (Upbit) | `jsonwebtoken` |
| 로깅 | `pino` |
| 시간 | `dayjs` |
| 프로세스 관리 | `systemd` |
| 테스트 | `vitest` |

### Dashboard (`/dashboard`, Cloudflare Pages)
| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) |
| 스타일 | Tailwind CSS |
| UI 컴포넌트 | shadcn/ui |
| 차트 | TradingView lightweight-charts + recharts (보조) |
| 인증 | Auth.js + GitHub Provider |
| 검증 | `zod` (shared/) |
| 배포 어댑터 | `@opennextjs/cloudflare` |

### Shared (`/shared`)
- TypeScript 타입 (`Trade`, `Position`, `Signal`, `Config`, `KillSwitchState`, ...)
- Zod 스키마 (런타임 검증 + 정적 타입 생성)
- 상수 (전략 파라미터 기본값, 마켓 코드 패턴)

### 인프라
| 영역 | 선택 |
|---|---|
| 패키지 매니저 | `pnpm` workspaces |
| Lint/Format | `biome` |
| 봇 배포 | GitHub Actions → SSH → Oracle VM → systemd reload |
| 대시보드 배포 | Cloudflare Pages 자동 (git 연동, root dir = `dashboard/`) |
| 시크릿 | 봇: systemd EnvironmentFile / 대시보드: CF env vars |
| TLS 리버스 프록시 | Caddy (auto Let's Encrypt) |

---

## 9. 단계별 로드맵 (MVP)

### Phase 0 — 셋업 (1주, 매매 X)
- [ ] Oracle Cloud ARM VM 프로비저닝 (Ubuntu 24.04, 1+ OCPU, 6+ GB)
- [ ] SSH 키 + ufw 방화벽 (22, 443)
- [ ] 도메인 + Caddy 자동 TLS
- [ ] 모노레포 스캐폴딩 (pnpm workspace, biome, tsx, vitest, drizzle, hono, next15, shadcn, opennextjs)
- [ ] `shared/` 첫 타입/Zod 스키마
- [ ] Upbit API 키 발급 (출금 권한 OFF, IP 화이트리스트)
- [ ] GitHub OAuth App 등록, Auth.js 셋업 (Allowed = MinwooJ only)
- [ ] Discord 웹훅 발급
- [ ] GitHub Actions: 봇 SSH 배포 워크플로
- [ ] Cloudflare Pages: 대시보드 연동 첫 배포
- **검증**: VM에서 `/v1/market/all` 응답, 대시보드 로그인 성공

### Phase 1 — Read-Only 토대 (1~2주, 매매 X)
- [ ] WS 매니저 (ticker+trade 전 KRW, PING, 재연결)
- [ ] In-memory 롤링 캔들 누적
- [ ] 지표 모듈 (ATR/RSI/EMA/BB/RVOL) + unit test
- [ ] DB 마이그레이션, config 시드
- [ ] **봇 시작 시 보유 종목 자동 protected 등록**
- [ ] 내부 HTTP API (Bearer, `/health`, `/status`, `/markets`, `/positions`, `/signals`, `/config`, `/protected`)
- [ ] Dashboard: 로그인, 시세 보드, 보호 종목 관리, 설정 화면(읽기)
- [ ] Discord: WS 끊김/재연결/봇 기동
- **검증**: 24시간 무중단, idle 회수 회피 OK

### Phase 2 — 신호 + 페이퍼 트레이딩 (2~3주, 시뮬레이션만)
- [ ] 전략 A: 틱 단위 박스 돌파 감지
- [ ] Risk Guard 7중 검문
- [ ] Position Manager: 위험 0.5% 사이징, SL/TP1/Trailing 상태머신
- [ ] `mode=paper`일 때 가상 체결 (슬리피지 0.1%)
- [ ] 백테스트 러너: 1~3개월 1분봉 시뮬
- [ ] Dashboard: 신호 로그, 포지션 카드, 손익 곡선, 파라미터 편집, KILL/모드 토글
- [ ] Discord: 신호/가상 진입/청산/일일 요약
- **종료 조건**: 1~2주 안정, 백테스트 vs 페이퍼 신호 일치율 ≥ 90%, 룰 위반 0

### Phase 3 — 소액 실거래 (10만원, 2~4주)
- [ ] Order Executor: 실제 REST 주문 (시장가)
- [ ] 멱등성: `client_order_id` UUIDv4
- [ ] 부분 체결 폴링/재시도
- [ ] Reconciler 1분 주기 (잔고 ↔ 원장)
- [ ] Live 시나리오 검증:
  - WS 끊김 중 보유 포지션 REST 청산
  - Rate limit 초과 시 token-bucket 큐잉
  - BTC -2% 신규 진입 정지
  - KILL_SWITCH 5초 내 반영
  - Protected coin 진입 0건
- **종료 조건**: 실거래 vs 페이퍼 손익 오차 ≤ ±0.5%p, 3중 안전망 0회 위반

### Phase 4 — 자본 확장 (100만원, 지속)
- `bot_capital_krw` 100만원으로 상향
- 주간 리뷰 루틴
- 백테스트 검증된 변경만 반영

### Phase 5 (옵션) — 전략 다양화
- B(Bollinger Squeeze) 또는 Lead-Lag(BTC→Alt) 페이퍼 병행
- 살아남은 전략 운영 편입

---

## 10. 미해결 / 위험 항목

| 항목 | 대응 |
|---|---|
| Oracle ARM capacity "Out of capacity" | 도쿄/오사카/시드니 다중 리전 시도, 안 되면 1~3일 재시도 |
| Oracle 7일 idle 회수 (CPU p95 < 20%) | 봇 자체 CPU + 가벼운 더미 백그라운드 작업 |
| WS idle 120s timeout | `ws.ping()` 60초마다 |
| Upbit REST rate limit 초과 | token-bucket 사전 차단 |
| Auth.js + CF 세션 저장 | 쿠키 only (단일 사용자) |
| 백테스트 데이터 수집 REST 10/s 제한 | 200봉씩 끊어 페이즈드 수집 |
| 5분봉 종가 트리거의 지연 | **WebSocket trade 실시간 틱 트리거** 채택 |
| 박스 식별의 임의성 | 처음엔 단순 룰로 시작, 페이퍼 결과 보고 튜닝 |
| 단순 모멘텀 전략의 적대적 선택 (우리가 exit liquidity) | 박스 돌파 + 다중 필터로 완화. 결국 페이퍼 결과로 판단 |
| 백테스트 생존자 편향 / 짧은 기간 | 6개월+ 다양한 시장 레짐 검증, 페이퍼가 진짜 검증 |

---

## 11. 의사결정 이력 (Decision Log)

| 일자 | 결정 | 이유 |
|---|---|---|
| 2026-05-16 | 거래소: Upbit | 한국 사용자, 원화 직거래, KRW 마켓 풍부 |
| 2026-05-16 | WebSocket으로 시세 수집 | REST 10/s 제한 우회, 실시간성 확보 |
| 2026-05-16 | 봇 호스팅: Oracle Cloud Always Free | 진짜 무료 + 강력한 사양 (4 OCPU/24GB ARM) |
| 2026-05-16 | 매매 주기: 1~5분 단타 + 실시간 틱 | 사용자 선호, 종가 대기는 지연 큼 |
| 2026-05-16 | 전략 선택: A 단독 (Box Breakout) | 단순할수록 디버깅 쉬움, v2에서 확장 |
| 2026-05-16 | 거래당 위험: 0.5% | 보수적 시작, 페이퍼 후 조정 가능 |
| 2026-05-16 | 언어: TypeScript 통일 | 모노레포 타입 공유, Next.js와 동일 언어 |
| 2026-05-16 | Worker 분리 X | Next.js API Routes가 BFF 겸용 → 단순화 |
| 2026-05-16 | 보호 종목 3중 안전망 (Blacklist + Ledger + HardCap) | 기존 보유 자산 절대 보호 |
