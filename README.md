# maybit

Upbit KRW 마켓 단타 자동매매 봇 + 운영 대시보드.

> **상태**: Phase 0 (스캐폴딩 완료, 매매 로직 없음). 모든 설계 결정은 [docs/PLAN.md](./docs/PLAN.md) 참조.

---

## 핵심 컨셉

- **거래소**: Upbit (현물 KRW 마켓)
- **전략**: Box Breakout — 횡보 박스 + 거래량 급증 돌파를 **WebSocket 실시간 틱**으로 감지
- **위험 관리**: 거래당 자본의 **0.5% 고정**, 동시 보유 최대 3종목, ATR 기반 손절/익절/트레일링
- **자본 격리**: 기존 보유 종목은 **3중 안전망**(블랙리스트 + 봇 원장 + 하드캡)으로 절대 보호
- **운영**: 봇은 Oracle Cloud Always Free ARM에서 24/7, 대시보드는 Cloudflare Pages

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 언어 | TypeScript (전 패키지 통일) |
| 봇 런타임 | Node.js 22 LTS (ARM64) |
| 봇 핵심 | `ws`, `hono`, `better-sqlite3`, `drizzle-orm`, `zod`, `pino`, `dayjs` |
| 대시보드 | Next.js 16 (App Router) + Tailwind 4 + shadcn/ui + Auth.js |
| 차트 | TradingView lightweight-charts |
| 패키지 매니저 | pnpm (workspaces) |
| Lint/Format | Biome |
| 인프라 | Oracle Cloud (봇) + Cloudflare Pages (대시보드) + GitHub Actions (CI/CD) |

---

## 레포 구조

```
maybit/
├── bot/                    @maybit/bot — 24/7 매매 봇 (Oracle VM)
│   └── src/
├── dashboard/              @maybit/dashboard — Next.js 대시보드 (Cloudflare Pages)
│   └── src/
├── shared/                 @maybit/shared — Zod 스키마/TS 타입/상수 (양쪽 공유)
│   └── src/
├── docs/                   기획·운영 문서 (필독)
│   ├── PLAN.md             ★ 모든 설계 결정의 단일 진실 공급원
│   ├── PHASE0_ORACLE.md    Oracle Cloud VM 셋업 가이드
│   └── ...
├── package.json            pnpm workspace 루트
├── pnpm-workspace.yaml
├── biome.json
├── tsconfig.base.json
└── CLAUDE.md               AI 에이전트용 컨텍스트
```

---

## 빠른 시작 (로컬 개발)

### 사전 요구사항
- Node.js **22 이상** (`.nvmrc` 참조)
- pnpm **10 이상** (`corepack enable` 또는 `npm i -g pnpm`)

### 설치 및 실행

```bash
# 의존성 설치 (워크스페이스 일괄)
pnpm install

# 봇 (Phase 0 스캐폴드: 시작 로그 + 하트비트만 출력)
pnpm dev:bot

# 대시보드 (Next.js)
pnpm dev:dashboard
# → http://localhost:3000

# 전체 타입체크
pnpm typecheck

# 린트
pnpm lint
```

### 환경변수

봇은 `bot/.env.example`을 복사해서 `bot/.env`로 만들고 채운다. **`.env`는 절대 커밋 금지** (`.gitignore`로 자동 제외).

```bash
cp bot/.env.example bot/.env
$EDITOR bot/.env
```

대시보드는 Phase 0 시점엔 환경변수 불필요. Phase 1에서 GitHub OAuth + 봇 API URL이 추가됨.

---

## 문서 인덱스

| 문서 | 내용 |
|---|---|
| [docs/PLAN.md](./docs/PLAN.md) | **단일 진실 공급원** — 아키텍처, 전략 룰, 데이터 모델, 로드맵, 의사결정 이력 |
| [docs/PHASE0_ORACLE.md](./docs/PHASE0_ORACLE.md) | Oracle Cloud Always Free VM 프로비저닝 |
| [CLAUDE.md](./CLAUDE.md) | AI 에이전트(Claude Code 등)용 작업 컨텍스트 |

---

## 안전 원칙 (강제 사항)

이 봇은 실제 돈을 다룬다. 다음 원칙은 **타협 대상이 아니다**.

1. **출금 권한 OFF**: Upbit API 키에 출금 권한을 절대 부여하지 않는다.
2. **보호 종목 3중 안전망**: 사용자의 기존 보유 종목은 (1) 블랙리스트, (2) 봇 소유 수량 원장, (3) 자본 하드캡 셋 모두를 통과해야 매도 가능 — 즉 봇은 자기가 산 것만 판다.
4. **시크릿은 절대 커밋 금지**: `.env`, `*.pem`, API 키 등은 `.gitignore`로 차단됨. 확인 후 `git add` 할 것.
5. **KILL_SWITCH**: 어드민에서 1클릭으로 즉시 신규 진입 차단. 보유 포지션은 정상 SL/TP 룰 유지.
6. **단계적 자본 확대**: 페이퍼 → 10만원 → 100만원. 백테스트와 페이퍼 결과가 일치해야 다음 단계 진입.

---

## 라이선스

Private 프로젝트 — 라이선스 미설정.
