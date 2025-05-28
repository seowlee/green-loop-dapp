# GreenLoop DApp

### 🧩 **프로젝트명:**

**green-loop-dapp**

> 친환경 행동 → 토큰 보상 → 재참여의 선순환 구조를 만드는 Web3 기반 로컬 스왑 DApp

### 🎯 **개발 목적:**

Remix와 Ganache를 활용한 로컬 스마트컨트랙트 개발 실습을 통해 Web3 기술 기반 보상 시스템을 구현하고 체험합니다.

### 🛠 **주요 학습 내용:**

- Solidity의 `mapping`과 `struct` 활용
- 관리자 권한 제어(`Ownable`) 구현
- Next.js 기반 프론트엔드 DApp 개발
- Web3 기술 기반 보상 시스템 구현
- MetaMask 지갑 연동 및 계정 관리

### 📁 **프로젝트 구조:**

```

green-loop-dapp/
├── contracts/ # 스마트 컨트랙트
│ ├── GreenLoop.sol # 메인 컨트랙트
│ ├── GreenToken.sol # GRN 토큰 컨트랙트
│ └── RewardToken.sol # RWD 토큰 컨트랙트
└── green-loop-ui/ # 프론트엔드 애플리케이션
├── src/
│ └── app/
│  └── page.tsx # 메인 페이지
└── package.json

```

### 💡 **주요 기능:**

#### 1. 토큰 시스템

- **GreenToken (GRN)**: 친환경 행동에 대한 보상 토큰
- **RewardToken (RWD)**: GRN을 스왑하여 받는 보상 토큰

#### 2. 사용자 기능

- **계정 관리**

  - MetaMask 지갑 연결
  - Admin/User 계정 전환
  - 계정별 잔액 조회

- **토큰 스왑**
  - GRN → RWD 자동 계산
  - 스왑 실행 및 기록
  - 스왑 내역 조회 (페이지네이션)

#### 3. 관리자 기능

- **토큰 관리**
  - GRN 토큰 전송 (Admin → User)
  - RWD 토큰 전송 (Admin → Contract)
  - 스왑 비율 설정
  - 컨트랙트 토큰 인출

### 🚀 **시작하기:**

#### 사전 요구사항

- Node.js 및 npm/yarn
- MetaMask 지갑
- Ganache (로컬 블록체인)

#### 설치 및 실행

```bash
# 저장소 클론
git clone git@github.com:seowlee/green-loop-dapp.git

# 컨트랙트 배포 (Remix IDE 사용)
# 1. Remix IDE에서 contracts/ 디렉토리의 .sol 파일들을 열기
# 2. Ganache 네트워크 연결
# 3. 컨트랙트 배포

# 프론트엔드 실행
cd green-loop-ui
npm install
npm run dev

```

### 🔄 **작동 흐름:**

1. Admin이 GRN 토큰을 User에게 전송
2. Admin이 RWD 토큰을 GreenLoop 컨트랙트에 전송
3. User가 GRN 토큰을 컨트랙트에 승인
4. User가 GRN을 RWD로 스왑
5. 스왑 내역이 기록되고 조회 가능

### 🛡 **보안 기능:**

- OpenZeppelin의 `Ownable` 컨트랙트를 통한 관리자 권한 제어
- 토큰 전송 및 스왑 시 안전성 검증
- 계정별 권한에 따른 기능 제한

### 📝 **기술 스택:**

- **스마트 컨트랙트**
  - Solidity
  - OpenZeppelin
  - Ganache (로컬 테스트넷)
- **프론트엔드**
  - Next.js
  - React
  - ethers.js
  - MetaMask

### 🔍 **테스트:**

- Ganache를 통한 로컬 테스트넷에서 컨트랙트 배포 및 테스트
- MetaMask를 통한 계정 전환 및 트랜잭션 테스트
- 다양한 시나리오의 스왑 테스트

### 📚 **참고 사항:**

- 이 프로젝트는 로컬 개발 환경을 위한 교육용 프로젝트입니다.
- 실제 운영 환경에 적용하기 위해서는 추가적인 보안 검토가 필요합니다.
- 컨트랙트 주소와 ABI는 배포 후 프론트엔드 코드에 업데이트해야 합니다.

