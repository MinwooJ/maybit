# Phase 0 — GitHub Actions로 Oracle VM에 봇 자동 배포

`main`에 푸시되면 GitHub Actions가 자동으로 봇 코드를 Oracle VM에 rsync하고 systemd 서비스를 재시작한다.

> 사전 조건: [PHASE0_ORACLE.md](./PHASE0_ORACLE.md)의 1~6단계 완료 (VM 생성, SSH 접속, Node 22 + pnpm 설치).

---

## 1. VM 측 1회 셋업

### 1-1. 배포 디렉터리 생성

VM 안에서:

```bash
sudo mkdir -p /opt/maybit
sudo chown -R ubuntu:ubuntu /opt/maybit
```

### 1-2. corepack 활성 (pnpm 관리)

`packageManager` 필드의 pnpm 버전을 자동 해소.

```bash
corepack enable
corepack prepare pnpm@10.24.0 --activate
pnpm --version   # 10.24.0 확인
```

### 1-3. 봇 환경변수 파일 작성

`.env.example`를 참고해 `.env`를 만든다 (시크릿이므로 절대 git에 들어가면 안 됨).

```bash
# 첫 배포 후에 GitHub Actions가 .env를 제외하고 rsync하므로
# 이 파일은 VM에 직접 생성한다.
sudo mkdir -p /opt/maybit/bot
sudo touch /opt/maybit/bot/.env
sudo chown ubuntu:ubuntu /opt/maybit/bot/.env
sudo chmod 600 /opt/maybit/bot/.env
$EDITOR /opt/maybit/bot/.env
```

내용 (Phase 0 시점):

```dotenv
NODE_ENV=production
LOG_LEVEL=info
# 나머지(UPBIT_*, DISCORD_*, BOT_API_*)는 해당 Phase에 채움
```

### 1-4. systemd 유닛 설치

레포의 `infra/maybit-bot.service`가 첫 배포 시 `/opt/maybit/infra/`에 들어가므로, 이를 시스템에 심볼릭 링크해서 사용한다 (코드 업데이트 시 자동 반영).

```bash
# 첫 배포 전에는 레포가 아직 VM에 없으므로 한 번만 직접 복사:
# (rsync 후에는 ln -sf로 바꿔도 됨)
sudo cp /opt/maybit/infra/maybit-bot.service /etc/systemd/system/maybit-bot.service
sudo systemctl daemon-reload
sudo systemctl enable maybit-bot
# 첫 시작은 첫 배포 끝나고
```

### 1-5. 무비밀번호 sudo (systemctl restart만)

GitHub Actions가 SSH로 들어와 `sudo systemctl restart maybit-bot` 을 실행해야 함. 비밀번호 입력 불가하므로 **이 명령에 한정**해서 sudoers 허용.

```bash
sudo visudo -f /etc/sudoers.d/maybit-bot
```

내용:

```
ubuntu ALL=(root) NOPASSWD: /bin/systemctl restart maybit-bot, /bin/systemctl status maybit-bot, /bin/systemctl reload maybit-bot
```

저장하면 visudo가 문법 검증함. 잘못 입력 시 저장 안 됨.

**✅ 체크**
- [ ] `/opt/maybit` 존재 + ubuntu 소유
- [ ] `corepack pnpm --version` → 10.24.0
- [ ] `/opt/maybit/bot/.env` 존재 (모드 600)
- [ ] `systemctl status maybit-bot` 인식됨 (아직 가동은 안 함)
- [ ] `sudo -n systemctl status maybit-bot` 가 비밀번호 안 묻고 실행됨

---

## 2. SSH 배포 키 (선택 — 보안 모범)

**옵션 A**: PHASE0_ORACLE에서 만든 `maybit_oracle` 키를 그대로 GitHub Actions에서도 사용 (간단).

**옵션 B (권장)**: GitHub Actions 전용 deploy 키를 따로 만들어 권한 분리.

옵션 B로 가는 경우 로컬에서:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/maybit_deploy -C "github-actions@maybit" -N ""
# 공개키를 VM의 ubuntu authorized_keys에 추가
ssh-copy-id -i ~/.ssh/maybit_deploy.pub maybit
# 개인키 내용 (전체) 복사:
cat ~/.ssh/maybit_deploy
```

---

## 3. GitHub Secrets / Variables 등록

레포 → **Settings** → **Secrets and variables** → **Actions**.

### Secrets (`Repository secrets` 탭)

| 이름 | 값 |
|---|---|
| `ORACLE_HOST` | VM Public IP 또는 도메인 (예: `129.213.x.x` 또는 `bot.maybit.example.com`) |
| `ORACLE_USER` | `ubuntu` |
| `ORACLE_SSH_KEY` | 옵션 A/B에서 정한 **개인키 전체 내용** (`-----BEGIN OPENSSH PRIVATE KEY-----`부터 끝까지) |
| `ORACLE_DEPLOY_PATH` | `/opt/maybit` |

### Variables (`Variables` 탭)

| 이름 | 값 |
|---|---|
| `DEPLOY_ENABLED` | `true` ← **이게 켜지기 전까지 워크플로는 typecheck만 돌고 배포는 스킵** |

> 처음에는 `DEPLOY_ENABLED=false`(또는 미설정)로 두고, 위 1~3 단계 다 끝나면 `true`로 바꾸는 안전 패턴.

---

## 4. 첫 배포

세팅이 끝났으면 트리거를 발생시킨다.

```bash
# 옵션 1: 빈 커밋으로 트리거
git commit --allow-empty -m "ci: trigger first bot deploy"
git push origin main

# 옵션 2: GitHub UI에서 Actions 탭 → "Deploy bot to Oracle VM" → Run workflow
```

워크플로 결과 확인:
- Actions 탭에서 두 job: `typecheck` → `deploy`
- `deploy` job의 마지막 step에 `systemctl status maybit-bot`가 `active (running)` 이면 성공

---

## 5. 동작 검증

VM에서:

```bash
sudo systemctl status maybit-bot
journalctl -u maybit-bot -f --no-pager   # 실시간 로그
```

기대 출력 (Phase 0 시점):

```
maybit bot starting (KST)
default config validated
bot running — Phase 0 scaffold (no trading logic yet)
heartbeat (10초마다)
```

---

## 6. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `Permission denied (publickey)` | `ORACLE_SSH_KEY` Secret이 잘못됨. 공개키 아닌 **개인키** 전체 내용 (헤더/푸터 포함). 줄바꿈 보존 필수. |
| `Host key verification failed` | `ssh-keyscan` 단계가 실패. `ORACLE_HOST` 값 확인 (IP/도메인 정확한지). |
| rsync `Permission denied` | VM에서 `/opt/maybit` 소유권 확인 (`ls -ld /opt/maybit`가 ubuntu:ubuntu) |
| `corepack: command not found` | Node 22 LTS 설치 확인. 구버전 Node는 corepack 별도 설치 필요. |
| `sudo: a password is required` | sudoers 룰 누락 또는 잘못 (단계 1-5). `sudo -n systemctl restart maybit-bot`이 통과해야 함. |
| systemd 서비스 즉시 죽음 | `journalctl -u maybit-bot -n 100`로 로그 확인. 흔한 원인: `.env`에 `EnvironmentFile` 파싱 에러 (값에 `#` 등) |
| 배포는 성공인데 매번 같은 코드 | `paths` 필터에 안 걸리는 디렉터리만 바꿨는지 확인. `workflow_dispatch`로 수동 트리거 가능. |

---

## 7. 보안 노트

- `ORACLE_SSH_KEY`는 **개인키**라서 외부에 노출되면 VM 장악 위험. GitHub Secrets 외 어디에도 복사하지 말 것.
- sudoers 룰은 **systemctl 일부 명령에만** 허용. `ALL=NOPASSWD: ALL` 절대 금지.
- Actions 로그에 키 출력 안 되도록 `printf '%s\n' "$ORACLE_SSH_KEY"`로 처리 (워크플로 안에 적용됨).
- VM의 `bot/.env`는 모드 `600` 유지 (다른 사용자 읽기 불가).
- 배포 키와 사용자 키 분리(옵션 B) 권장 — 사용자 키가 노출되어도 배포 권한은 회수 가능.
