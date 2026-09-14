# 실결제 스모크 런북 (이니시스 1건)

최종 갱신: 2026-09-14 · 사전 점검: Cowork 세션 · **실행: 운영자**

---

## 먼저 읽을 것 — 이 결제는 시스템에서 환불되지 않는다

관리자 화면의 환불은 **의도만 저장한다.** 승인 응답에 `pgCalled: false` 가 그대로 들어 있고,
실제 취소 API 를 가진 `createInicisSandboxAdapter` 는 저장소 어디에서도 호출되지 않는다
(정의부 한 곳뿐 — `src/payment/inicis.ts:366`).

자동으로 돈이 돌아오는 경로는 **망취소 하나뿐**이고, 그것도 "PG 승인은 됐는데 우리 저장이
실패한" 경우에 한해 그 요청 안에서만 동작한다(`recoverInicisPostApprovalFailure`).

> **결제가 정상 완료되면 그 금액은 이니시스 가맹점 콘솔에서 직접 취소하거나 실매출로 남는다.**

시작하기 전에 콘솔 접근 권한이 있는지 확인할 것.

---

## 현재 운영 설정 (2026-09-14 실측, `GET /api/payment/config`)

```json
{ "configured": true, "enabled": true, "checkoutEnabled": true,
  "testMode": false, "storage": "supabase", "storageReady": true,
  "provider": "inicis-standard",
  "returnUrl": "https://umsh.kr/api/payment/inicis/return",
  "closeUrl": "https://umsh.kr/payment/close", "mobileEnabled": true }
```

**결제는 이미 열려 있다.** `testMode: false` 이므로 결제창에서 승인하면 실제로 청구된다.

## 대상 상품

카탈로그 19개 중 최저가를 쓴다.

| 상품 | 금액 | 반환 경로 |
|---|---:|---|
| **lucky_color** (나한테 운 붙는 색과 물건) | **4,900원** | `/me/lucky/04-step-4-report/index.html` |

체크아웃 주소:

```
https://umsh.kr/payment?product=lucky_color&returnTo=/me/lucky/04-step-4-report/index.html
```

---

## 사전 확인 (결제 전)

- [ ] 이니시스 가맹점 콘솔 로그인 가능 — 취소가 필요할 때 유일한 경로다
- [ ] 결제에 쓸 계정으로 umsh.kr 로그인 (체크아웃은 Supabase 인증을 요구한다)
- [ ] 그 계정의 사주 프로필이 등록되어 있을 것 (없으면 `PROFILE_REQUIRED` 로 막힌다)
- [ ] 배포된 커밋을 적어 둘 것 — 어떤 빌드에서 난 결과인지 증거에 남긴다
- [ ] 결제 직전 시각(KST)을 적어 둘 것 — 아래 대사 질의의 범위가 된다

> 체크아웃 경로는 이번 세션의 변경(T-4·T-6·T-6b)과 겹치지 않는다.
> 배포 전에 돌려도 되고, 배포 후에 돌려도 된다. 다만 **어느 쪽인지 기록**할 것.

---

## 실행

1. 위 체크아웃 주소를 연다. 상품명과 **4,900원**이 화면에 뜨는지 확인한다.
2. 결제 안내 이메일·휴대폰을 넣고 약관에 동의한 뒤 **결제창 열기**.
3. 이니시스 결제창에서 카드로 승인한다. — **여기서부터 실제 청구다.**
4. 승인 후 `/payment/result?orderId=...&state=paid` 로 돌아오는지 본다.
   `state=failed` 로 돌아오면 화면의 문구를 그대로 적어 둔다.
5. 반환 경로(`/me/lucky/...`)에서 유료 해석이 실제로 열리는지 확인한다.

돌아온 URL 의 `orderId` 를 적어 둔다. 이후 모든 확인이 이 값으로 이어진다.

---

## 확인할 것 (결제 후)

### 1. 주문 상태

```
GET /api/payment/orders/{orderId}     (본인 세션)
GET /api/admin/v1/orders/{orderId}    (운영자 · orders:read)
```

- [ ] `status` 가 `paid` (열람 후에는 `viewed`)
- [ ] `amount` 가 **4900**
- [ ] `tid` 와 `approvalCode` 가 비어 있지 않다
- [ ] `payMethod` 가 실제 결제수단과 같다

### 2. 금융 증거 (append-only)

승인 뒤에는 주문 상태보다 **금융 이벤트가 먼저** 기록된다. 상태 투영이 실패해도 이 행은 남는다.

```sql
select order_id, kind, provider, source_ref, amount, occurred_at
from public.financial_events
where order_id = '{orderId}';
```

- [ ] `kind = 'payment_approved'`, `provider = 'inicis'`
- [ ] `source_ref` 가 이니시스 TID 와 일치
- [ ] `amount = 4900`
- [ ] **행이 정확히 1개** — 중복되면 `(provider, source_ref)` 유니크가 깨진 것이다
- [ ] `payment_net_cancelled` 행이 **없다**

### 3. 열람 권한

- [ ] 결제한 계정으로 해당 해석이 열린다
- [ ] **다른 계정으로는 열리지 않는다** (주문은 소유자+상품+리포트에 묶인다)
- [ ] 새로고침·재로그인 뒤에도 계속 열린다

### 4. 이니시스 콘솔 대사

- [ ] 콘솔의 거래 1건과 TID·금액·시각이 일치한다
- [ ] 우리 쪽에 없는 거래가 콘솔에 있지 않다 (반대도 마찬가지)

### 5. 관리자 화면

- [ ] `/admin/orders` 에서 이 주문이 보인다
- [ ] `/admin/refunds` 에서 주문 확인(주문 ID 조회)이 되고 금액·revision 이 잡힌다
      — **요청 저장까지만** 해도 되고, 하지 않아도 된다. 어느 쪽이든 PG 취소는 일어나지 않는다

---

## 실패했을 때

| 증상 | 의미 | 할 일 |
|---|---|---|
| `state=failed`, 콘솔에도 거래 없음 | 승인 전 실패 | 화면 문구를 기록. 청구 없음 |
| `state=failed`, **콘솔에는 거래 있음** | 승인 뒤 우리 저장 실패 | 망취소가 돌았는지 `financial_events` 의 `payment_net_cancelled` 로 확인. 없으면 **콘솔에서 직접 취소** |
| `paid` 인데 해석이 안 열림 | 권한 판정 문제 | 주문의 `reportId` 와 열려던 리포트 ID 를 비교. 다르면 결제 시점의 리포트 바인딩 문제 |
| `financial_events` 행이 없는데 `paid` | 있어서는 안 되는 상태 | 즉시 기록하고 배포 중단. 투영이 증거보다 앞섰다는 뜻이다 |

---

## 마무리

- [ ] 4,900원을 콘솔에서 취소했거나, 실매출로 남기기로 결정했다 (어느 쪽인지 기록)
- [ ] 결과를 `tone-v2/evaluations/` 형식에 맞춰 남긴다 — 주문 ID, TID, 금액, 시각,
      각 확인 항목의 통과 여부, 배포 커밋
- [ ] 카드번호·TID 전체·개인 연락처는 저장소에 넣지 않는다. TID 는 뒤 4자리만 남긴다

---

## 이 런북이 검증하지 못하는 것

- **환불 실행** — 구현되어 있지 않다(T17). 콘솔 취소는 우리 주문 상태를 바꾸지 않으므로,
  콘솔에서 취소하면 우리 쪽 `paid` 와 실제가 어긋난다. 그 불일치를 어떻게 정리할지는
  대사(T19) 과제다
- **부분 환불·다건 대사**
- **모바일 결제 경로** — `mobileEnabled: true` 지만 이 런북은 PC 경로 1건이다
