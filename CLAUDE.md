# CLAUDE.md — AI 에이전트 작업 가이드

이 파일은 Claude Code(또는 호환 AI 에이전트)가 이 레포에서 작업할 때의 컨텍스트와 규칙을 담는다.

---

## 프로젝트 컨텍스트

**maybit**은 Upbit KRW 마켓에서 1~5분봉 단타 자동매매를 수행하는 봇과 운영 대시보드.

- **실제 돈을 다룬다.** 모든 변경은 "이 코드가 사용자의 자본을 잃게 할 수 있는가?" 관점으로 검토해야 한다.
- 봇은 사용자의 기존 보유 종목을 **절대 건드리지 않아야 한다** (3중 안전망: 블랙리스트 + 봇 원장 + 하드캡).
- Phase 0 (스캐폴드) → Phase 1 (read-only) → Phase 2 (페이퍼) → Phase 3 (10만원 실거래) → Phase 4 (100만원).

---

## 단일 진실 공급원

**[docs/PLAN.md](./docs/PLAN.md)** 가 모든 설계 결정의 SoT.

- 아키텍처, 전략 룰, 데이터 모델, 로드맵, 의사결정 이력이 전부 여기 있음
- 새 결정/변경 사항은 **먼저 PLAN.md를 업데이트**한 다음 코드를 바꾼다
- 의사결정 이력 섹션(11번)에 날짜와 이유를 기록한다

기타 문서:
- [README.md](./README.md) — 외부용 프로젝트 소개
- [docs/PHASE0_*.md](./docs/) — 각 셋업 단계의 단계별 가이드

---

## 절대 규칙 (Hard rules — 어기지 말 것)

1. **시크릿 커밋 금지**: `.env`, `*.pem`, API 키, 토큰 등은 절대 staged 되면 안 됨. `git add` 전에 항상 `git status`로 확인.
2. **Upbit API 키에 출금 권한 부여 금지**. 코드 어디에서도 출금 API 호출 금지.
3. **보호 종목 로직 변경은 사용자 명시 승인 필요**: `protected_coins` / `bot_positions` 원장 / 자본 하드캡 중 어느 하나라도 건드릴 때.
4. **실거래 코드(`mode='live'`) 경로 변경은 페이퍼 모드 회귀 테스트 필수**.
5. **전략 파라미터 기본값 변경**은 백테스트 결과를 보지 않고 하지 않는다.
6. **destructive git 명령**(`reset --hard`, `push --force`, `branch -D` 등)은 사용자 명시 요청에만 실행.
7. **`pnpm install` 외에 `npm install`/`yarn` 사용 금지** (lockfile 오염).

---

## 레포 구조 & 규칙

```
maybit/
├── bot/          @maybit/bot         — Node.js 서비스, Oracle VM 배포
├── dashboard/    @maybit/dashboard   — Next.js 16, Cloudflare Pages 배포
├── shared/       @maybit/shared      — Zod 스키마 / TS 타입 / 상수
├── docs/                              — 모든 .md 문서
└── .github/workflows/                 — CI/CD
```

### 타입/스키마 변경 시
1. **항상 `shared/`에서 시작**한다. Zod 스키마 추가/수정 → `types.ts`는 자동 추론(`z.infer`).
2. 그 다음 `bot/`과 `dashboard/`에서 import해서 사용.
3. `pnpm -r typecheck`로 양쪽 패키지가 같이 컴파일되는지 확인.

### 코딩 스타일
- TypeScript strict mode (`tsconfig.base.json` 참조)
- `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `exactOptionalPropertyTypes` 활성
- Import는 `import type` / `import` 명확히 분리
- 포맷팅은 **Biome**가 강제 (`pnpm format`)
- ES Modules 전용 (`type: "module"`)
- 파일 확장자는 import 시 `.js` 사용 (TS 컴파일 후 호환): `import { ... } from './foo.js'`

### 주석
- 기본적으로 주석 **쓰지 않는다**. 식별자가 자명해야 함.
- *왜* 그렇게 했는지가 비명백할 때만 짧은 주석.
- 코드 자체가 설명하는 *무엇*에 대한 주석 금지.

---

## 자주 쓰는 명령

```bash
# 설치
pnpm install

# 개발
pnpm dev:bot                            # 봇 (tsx watch)
pnpm dev:dashboard                      # Next.js 대시보드

# 타입체크 / 빌드 / 린트
pnpm -r typecheck
pnpm -r build
pnpm lint
pnpm format

# 테스트
pnpm test                               # 전 워크스페이스
pnpm --filter @maybit/bot test          # 봇만

# 봇 단일 실행 (start)
pnpm --filter @maybit/bot start
```

---

## 작업 흐름 가이드

### 새 기능 추가 시
1. PLAN.md를 먼저 읽어 관련 결정이 있는지 확인
2. 영향받는 패키지 식별 (shared/bot/dashboard 중)
3. shared/의 스키마부터 → bot/dashboard 순으로 변경
4. `pnpm -r typecheck` 통과 확인
5. 관련 테스트 추가 (특히 Risk Guard 같은 안전장치 변경 시)
6. PLAN.md "의사결정 이력"에 한 줄 기록

### 버그 수정 시
- 재현 케이스를 먼저 단위 테스트로 작성 (실패 확인) → 수정 → 통과 확인
- 매매 로직 버그는 잠재적 자금 손실 → 사용자에게 상세 보고

### 커밋 메시지 컨벤션
- `type(scope): subject` 형식 (예: `feat(bot): add WS reconnect logic`)
- type: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
- 본문에 "왜"를 적는다 (무엇은 diff가 말함)
- 시크릿 포함 여부 다시 한 번 확인

---

## 환경 / 인프라

- **봇 호스팅**: Oracle Cloud Always Free, ARM Ampere A1, Ubuntu 24.04
- **대시보드 호스팅**: Cloudflare Pages (Next.js → `@opennextjs/cloudflare` 어댑터)
- **DB**: SQLite (better-sqlite3), 봇과 같은 VM의 `/opt/maybit/data/maybit.db`
- **CI/CD**: GitHub Actions → `bot/` 변경 시 SSH 배포 / Cloudflare Pages 자동 빌드
- **로깅**: pino (개발: pretty, 프로덕션: JSON)
- **알림**: Discord 웹훅
- **시크릿 보관**: VM은 systemd EnvironmentFile, Cloudflare는 env vars, GitHub Actions는 Secrets

---

## 자주 묻는 함정

- **better-sqlite3는 ARM에서 빌드 필요**: VM에 `build-essential` 설치되어 있어야 함.
- **Next.js 16은 13/14와 API/규칙이 다르다**: `dashboard/AGENTS.md` 경고 참조. 코드 작성 전 최신 문서 확인.
- **Upbit WS 메시지는 binary**: `ws` 라이브러리 사용 시 `binary` 옵션 또는 `Buffer → JSON.parse` 처리.
- **Upbit REST rate limit 그룹별 차이**: candle/ticker 등 10/s, order 8/s, default 30/s. token bucket으로 그룹 분리.
- **KST 처리**: 거래소 데이터는 epoch ms (UTC). 표시는 항상 `Asia/Seoul`. `dayjs.tz('Asia/Seoul')` 사용.
- **pnpm workspace 의존성**: `"@maybit/shared": "workspace:*"`로 선언. Next.js는 `transpilePackages`에 추가됨.

---

## 사용자와의 협업 원칙

- **모호하면 묻는다**. 추측해서 코드 쓰지 말 것. 특히 자본/리스크 관련.
- **광범위한 변경 전에 계획을 짧게 보여주고 동의 받는다**.
- **응답은 짧게**. 코드는 자명하게. 설명은 필요한 만큼만.
- 사용자가 "리뷰해줘"라고 하면 **자기 제안을 비판적으로** 본다 — 잘 된 부분만 골라 보여주지 않는다.
- 한국어 사용자. 응답은 한국어로 (코드/식별자는 영어).
