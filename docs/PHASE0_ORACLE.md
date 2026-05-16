# Phase 0 — Oracle Cloud VM 셋업 가이드

봇이 24/7 가동될 ARM Always Free 인스턴스를 만든다. 이 가이드는 단계별로 따라하면 되도록 쓰여있다. **각 섹션 끝의 ✅ 체크리스트**를 다 통과해야 다음으로 간다.

> 핵심 사양: VM.Standard.A1.Flex (ARM Ampere), 1 OCPU + 6 GB RAM, Ubuntu 24.04, Always Free 한도 내

---

## 1. SSH 키 생성 (로컬, Oracle 들어가기 전)

먼저 로컬 맥에서 SSH 키 한 쌍 만든다. 이미 있는 키 재사용 가능하지만, 이 봇 전용 키 분리 권장.

```bash
mkdir -p ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/maybit_oracle -C "maybit-bot@oracle"
# passphrase는 빈 값으로 OK (자동 SSH 배포 위해)
```

생성 결과:
- 개인키: `~/.ssh/maybit_oracle` (절대 외부 공개 금지)
- 공개키: `~/.ssh/maybit_oracle.pub` (Oracle에 업로드할 것)

```bash
cat ~/.ssh/maybit_oracle.pub
# 이 내용을 클립보드에 복사해둔다
```

**✅ 체크**
- [ ] `~/.ssh/maybit_oracle`, `~/.ssh/maybit_oracle.pub` 두 파일 존재
- [ ] 공개키 내용 복사됨

---

## 2. Oracle Cloud 콘솔 로그인 & 리전 확인

https://cloud.oracle.com 로그인.

홈 리전이 본인 위치에 가까운지 확인 (오른쪽 상단 표시). **리전은 한 번 정해지면 변경 어려움**. 한국 사용자는 보통:
- **Tokyo (NRT)** — 지연 짧음, A1 capacity 부족 빈번
- **Osaka (KIX)** — 지연 짧음, capacity 잡힐 때 있음
- **Seoul (ICN)** — Always Free 미지원 리전인 경우 있음 (확인 필요)

가입 시 자동 지정된 리전이 어느 곳인지 우측 상단에서 확인.

**✅ 체크**
- [ ] 홈 리전 확인됨
- [ ] Always Free 표시가 계정에 있음 (좌측 상단 사용자 메뉴에서 확인 가능)

---

## 3. VCN(가상 네트워크) 생성

좌측 햄버거 메뉴 → **Networking** → **Virtual Cloud Networks** → "Start VCN Wizard"

- "Create VCN with Internet Connectivity" 선택
- 이름: `maybit-vcn`
- CIDR 등은 기본값
- "Next" → "Create"

생성된 VCN 안의 **Public Subnet**의 **Security List**를 클릭 → "Add Ingress Rules"로 다음 두 규칙 추가:

| Source CIDR | IP Protocol | Destination Port |
|---|---|---|
| `0.0.0.0/0` | TCP | `22` (SSH) |
| `0.0.0.0/0` | TCP | `443` (HTTPS) |

> 80 포트는 Caddy auto-TLS의 ACME 인증을 위해 필요 시 추가. 일단 22, 443만.

**✅ 체크**
- [ ] VCN `maybit-vcn` 생성됨
- [ ] Public Subnet의 Security List에 22, 443 ingress 추가됨

---

## 4. ARM Compute 인스턴스 생성

좌측 메뉴 → **Compute** → **Instances** → "Create Instance"

| 설정 | 값 |
|---|---|
| Name | `maybit-bot` |
| Compartment | 기본 (root) |
| Placement (AD) | AD-1부터 시도 (capacity 부족 시 AD-2, AD-3으로 변경) |
| Image | **Canonical Ubuntu 24.04 Minimal aarch64** (이미지 선택에서 "Change Image" → Operating System: Canonical Ubuntu, Image Build: 24.04, Shape series는 자동) |
| Shape | **"Change Shape" → "Ampere" 탭 → VM.Standard.A1.Flex** → 1 OCPU, 6 GB RAM |
| Networking | 위에서 만든 `maybit-vcn`의 Public Subnet 선택. "Assign a public IPv4 address" 체크 |
| SSH Keys | "Paste public keys" → 1단계에서 복사한 `maybit_oracle.pub` 내용 붙여넣기 |
| Boot Volume | 기본 (50 GB) — Always Free는 총 200 GB까지 무료 |

"Create" 클릭.

### 4-1. "Out of capacity" 에러 처리

ARM 인스턴스는 capacity가 자주 부족하다. 다음을 순서대로 시도:
1. 다른 AD 선택 (AD-1 → AD-2 → AD-3)
2. 시간대를 바꿔 재시도 (한국 새벽 / 미국 새벽 시간대에 잡힐 가능성 ↑)
3. 같은 리전 내에서 며칠에 걸쳐 반복 시도
4. 안 되면 다른 무료 리전으로 변경 (Tokyo ↔ Osaka)

**자동화 팁** (선택): OCI CLI로 반복 시도 스크립트 가능. 일단 수동으로 몇 번 시도부터.

**✅ 체크**
- [ ] 인스턴스 상태가 **RUNNING**
- [ ] Public IP 주소 확인됨 (인스턴스 상세 페이지)

---

## 5. SSH 접속 확인

로컬에서:

```bash
ssh -i ~/.ssh/maybit_oracle ubuntu@<PUBLIC_IP>
# 첫 접속 시 fingerprint 확인 → yes
```

접속되면 OS 업데이트와 기본 패키지 설치 (한 번에):

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ca-certificates ufw fail2ban
```

### 5-1. ufw 방화벽 설정 (Oracle Security List와 이중 방어)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

### 5-2. SSH config 단축 (로컬 맥에서 편하게)

로컬 `~/.ssh/config`에 추가:

```
Host maybit
    HostName <PUBLIC_IP>
    User ubuntu
    IdentityFile ~/.ssh/maybit_oracle
    ServerAliveInterval 30
```

이제 `ssh maybit`만으로 접속 가능.

**✅ 체크**
- [ ] `ssh maybit` 정상 접속
- [ ] `apt upgrade` 완료
- [ ] ufw 활성, 22/443만 열림

---

## 6. Node.js 22 LTS 설치 (ARM64)

VM 안에서:

```bash
# Node.js 22 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs build-essential
node --version   # v22.x 확인
npm --version

# pnpm 설치
sudo npm install -g pnpm
pnpm --version
```

`build-essential`은 `better-sqlite3` 같은 네이티브 빌드 모듈에 필요.

**✅ 체크**
- [ ] `node -v` → `v22.x`
- [ ] `pnpm -v` 출력됨

---

## 7. Caddy 설치 (자동 TLS 리버스 프록시)

대시보드(CF Pages)에서 봇 내부 API로 HTTPS 호출하려면 봇 쪽에 도메인 + TLS가 필요. Caddy가 Let's Encrypt 자동 발급.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile` 편집은 도메인 확정 후 Phase 1에서 진행.

**✅ 체크**
- [ ] `caddy version` 출력됨

---

## 8. 도메인 준비 (선택, 권장)

봇 API 엔드포인트용 도메인 필요 (예: `bot.maybit.example.com`).

- 보유 중인 도메인이 있다면 서브도메인을 Oracle 인스턴스 Public IP의 A 레코드로 가리킴
- 없으면 [Cloudflare Registrar](https://cloudflare.com/) 또는 도메인 무료 옵션
- DNS는 Cloudflare로 위임하면 Pages(대시보드)와 일원화

**대안**: 도메인 없이도 Cloudflare Tunnel로 IP 노출 없이 봇 API를 노출하는 방법 가능. Phase 1 직전에 결정.

**✅ 체크**
- [ ] 사용할 도메인/서브도메인 결정 (또는 Cloudflare Tunnel 사용 결정)

---

## 9. Idle 회수 방지 인지

Oracle Always Free 정책: **7일간 CPU p95 사용률 < 20%** 면 인스턴스 회수 가능.

봇 자체가 WebSocket 처리/지표 계산으로 어느 정도 CPU 쓸 것이지만, 안전하게 Phase 2 진입 전까지는 가벼운 더미 워크로드를 같이 띄워두는 것을 권장.

예시 (Phase 1 진입 시 systemd로 만들 예정):

```bash
# 매 분 30초간 1코어를 가볍게 점유
*/1 * * * * /usr/bin/timeout 30 yes > /dev/null
```

**✅ 체크**
- [ ] 정책 인지 (실제 적용은 Phase 1에서)

---

## 다음 단계

여기까지 끝나면 **Phase 0의 인프라 절반**이 완료. 나머지 절반은:
- 로컬 모노레포 스캐폴딩 (병행 진행 중)
- GitHub Actions로 SSH 배포 워크플로 추가
- Cloudflare Pages 연동
- Upbit API 키 발급 (출금 권한 OFF)
- GitHub OAuth App 등록
- Discord 웹훅 발급

이들은 별도 문서/대화에서 이어간다.
