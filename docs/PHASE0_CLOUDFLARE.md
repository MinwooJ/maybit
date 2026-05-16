# Phase 0 — Cloudflare에 대시보드 배포

Next.js 대시보드를 Cloudflare Workers에 배포한다. `git push origin main` 시 Cloudflare가 자동 빌드/배포.

> 참고: Cloudflare는 더 이상 "Pages"와 "Workers"를 분리하지 않는다. 새 Next.js 앱은 **`@opennextjs/cloudflare`** 어댑터로 Workers에 배포한다 (구 `@cloudflare/next-on-pages`는 deprecated).

---

## 1. 사전 준비

- Cloudflare 계정 (무료)
- 본 레포의 `dashboard/`에 이미 들어 있는 설정 파일:
  - `dashboard/open-next.config.ts`
  - `dashboard/wrangler.jsonc`
  - `dashboard/package.json` 의 `build:cf`, `deploy:cf`, `preview:cf` 스크립트

---

## 2. 로컬에서 한 번 빌드 검증

CF 설정에 들어가기 전에 빌드가 통과하는지 본다.

```bash
cd ~/maybit
pnpm install
pnpm --filter @maybit/dashboard build:cf
```

성공 시 `dashboard/.open-next/worker.js`가 생성됨. 이게 Workers에 업로드될 산출물.

> `.open-next/` 디렉터리는 `.gitignore`에 들어가 있어 커밋되지 않는다 (빌드 산출물이므로).

---

## 3. Cloudflare Dashboard에서 Workers 프로젝트 생성

### 3-1. Git 연결

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 로그인
2. 좌측 메뉴 → **Workers & Pages** → **Create**
3. **Import a repository** 선택
4. GitHub 계정 연결 후 `MinwooJ/maybit` 선택
5. 설정 화면이 뜨면 아래 값을 입력

### 3-2. Build 설정

| 항목 | 값 |
|---|---|
| **Project name** | `maybit-dashboard` (wrangler.jsonc의 `name`과 동일하게) |
| **Production branch** | `main` |
| **Root directory** | `dashboard` ← 모노레포에서 핵심 |
| **Build command** | `pnpm install --frozen-lockfile && pnpm --filter @maybit/dashboard run build:cf` |
| **Deploy command** | `pnpm --filter @maybit/dashboard exec wrangler deploy` |

> Build/Deploy 명령은 Cloudflare가 워크스페이스 루트를 인식하지 못하는 경우를 대비해 `--filter @maybit/dashboard` 로 명시한다. 만약 Root directory 안에서 실행되어 워크스페이스 인식이 안 되면, 명령을 `npx ... ` 또는 `cd ../ && ...` 형태로 조정.

### 3-3. Environment variables (Phase 0 시점)

지금은 비워둬도 됨. Phase 1에서 추가 예정:

```
NEXT_PUBLIC_BOT_API_BASE     # 봇 API의 HTTPS URL (Phase 1)
GITHUB_CLIENT_ID             # Auth.js
GITHUB_CLIENT_SECRET         # Auth.js (Encrypted)
AUTH_SECRET                  # Auth.js 세션 암호화 키 (Encrypted)
ALLOWED_GITHUB_USERS         # 콤마 구분 (예: "MinwooJ")
```

`Encrypted` 체크하면 빌드 로그/런타임에서 평문 노출 안 됨.

### 3-4. 첫 배포

**Save and Deploy** 클릭. Cloudflare가:
1. 레포 clone → `dashboard/`로 이동
2. `pnpm install` (이때 pnpm을 못 찾으면 `corepack enable && corepack prepare pnpm@10.24.0` 추가 필요)
3. `build:cf` 실행 → `.open-next/worker.js` 생성
4. `wrangler deploy` → Workers에 업로드

3~5분 후 `https://maybit-dashboard.<your-subdomain>.workers.dev` 에서 접속 확인.

---

## 4. pnpm 인식 문제 대응 (자주 발생)

Cloudflare 빌드 컨테이너가 pnpm을 기본 설치하지 않을 수 있음. 빌드 로그에 `pnpm: command not found` 나오면:

**옵션 A** — Build command를 다음으로 변경:
```bash
corepack enable && corepack prepare pnpm@10.24.0 --activate && pnpm install --frozen-lockfile && pnpm --filter @maybit/dashboard run build:cf
```

**옵션 B** — `dashboard/`에 `package-manager-strict=false` 설정한 별도 `.npmrc` 추가 후 npm 사용. 단 lockfile 정합성 깨질 수 있어 비권장.

**옵션 C** — Cloudflare의 Build environment variables에 `PNPM_VERSION=10.24.0` 추가 (Cloudflare가 지원하는 경우).

---

## 5. 커스텀 도메인 (선택)

`.workers.dev` 대신 본인 도메인을 쓰려면:

1. Workers 프로젝트 → **Settings** → **Domains & Routes** → **Custom Domain**
2. `dashboard.maybit.example.com` 같은 서브도메인 입력
3. 해당 도메인의 DNS가 Cloudflare로 위임되어 있어야 함 (자동 검증)
4. SSL/TLS 자동 발급

---

## 6. 빌드/배포 동작 검증

배포 완료 후:

- ✅ Workers URL에서 Next.js 기본 페이지가 보임
- ✅ 브라우저 콘솔에 에러 없음
- ✅ Cloudflare Dashboard → Workers → Logs 에서 요청 로그 확인
- ✅ `git push origin main` 후 CF가 자동으로 새 빌드 트리거 확인

---

## 7. 로컬 미리보기 (Wrangler with Miniflare)

배포 전 로컬에서 Workers 환경 시뮬레이션:

```bash
pnpm --filter @maybit/dashboard preview:cf
# → 보통 http://localhost:8787 에 노출
```

`next dev`가 일반 Node 환경, `preview:cf`가 Workers 런타임 환경. 두 환경에서 동작 차이를 점검할 때 사용.

---

## 8. 트러블슈팅

| 증상 | 해결 |
|---|---|
| Build 단계에서 `Cannot find module '@maybit/shared'` | `next.config.ts`의 `transpilePackages` 확인. `dashboard/`만 빌드되면서 workspace symlink가 빠진 경우 root에서 빌드 (Build command 옵션 A 참조) |
| `Worker exceeded CPU limit` (배포 후 요청 시) | Next.js 초기 렌더가 무겁거나 미들웨어 무한 루프. Logs 확인. |
| `nodejs_compat not enabled` | `wrangler.jsonc`의 `compatibility_flags`에 `nodejs_compat` 누락. 본 레포는 포함됨. |
| 커스텀 도메인이 SSL 발급 안 됨 | DNS A/CNAME이 Cloudflare 프록시 모드(주황 구름)인지 확인 |
| 푸시했는데 빌드 안 트리거 | CF에서 `dashboard/` 경로 변경만 감지하도록 설정 필요. 또는 Production branch가 `main` 맞는지 확인 |

---

## 9. Phase 1 진입 시 추가될 것

- **GitHub OAuth App** 등록 → `GITHUB_CLIENT_ID/SECRET` 환경변수 입력
- **Auth.js** 통합 (CLIENT_SECRET, AUTH_SECRET 추가)
- **봇 API URL** 환경변수 (`NEXT_PUBLIC_BOT_API_BASE`)
- 봇 측 Caddy 도메인이 결정되면 CORS 설정 양쪽 정합
