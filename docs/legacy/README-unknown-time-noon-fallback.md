# 시간 모름 · 12시 기준 버전 (보관)

팀원 변경 `2d0ca9e9` ("Fix unknown birth time guidance and certainty across KO EN JA", 2026-10-14 09:15) **직전** 상태를 보관한다.

## 그때 동작
1. 시간을 모르면 서버가 시간을 **12시로 채워서** 사주 8글자를 모두 계산했다(`hour ?? 12`).
2. 오행 분포·강약·용신·대운까지 시간을 아는 사람과 **같은 모양**으로 돌려줬다.
3. 결과 화면도 시간을 아는 사람과 같았다. 시주 칸에만 "시간 모름"이라고 적었다.

단점: 12시 가정으로 나온 오행 개수·강약·용신이 확정값처럼 보였다.

## 보관 위치
| 무엇 | 어디 | 비고 |
|---|---|---|
| 이름표(태그) | `legacy/unknown-time-noon-fallback` → `101e7bbd` | **가장 확실한 보관 방법.** 서버(origin)에도 올려 두었다(2026-10-14) |
| 코드 전용 압축 백업 | 프로젝트 밖 `legacy-backup/chungi-t_legacy-unknown-time-noon-fallback_101e7bbd_code-only.zip` | 글꼴·영상·이미지는 뺐다(3947개 파일, 약 20MB). `.env` 같은 비밀 파일은 들어 있지 않다 |
| 서버·계산 되돌리기 패치 | `unknown-time-noon-fallback.src-only.revert.patch` | `src/` 14개 파일. 작성 시점의 커밋된 코드에 그대로 적용됨 |
| 전체 되돌리기 패치 | `unknown-time-noon-fallback.revert.patch` | 번역본 제외 74개 파일. **그대로는 적용 안 됨**(그 뒤로 같은 파일이 더 바뀜). 참고용 |

## 사용법
```bash
# 그때의 코드 내용 보기
git show legacy/unknown-time-noon-fallback:src/server/app.ts

# 현재 작업을 건드리지 않고 그때 버전을 옆 폴더에 따로 띄우기
git worktree add ../chungi-t-legacy legacy/unknown-time-noon-fallback

# 현재 코드에 적용 가능한지 점검 (0이면 가능) / 실제 적용
git apply --check docs/legacy/unknown-time-noon-fallback.src-only.revert.patch
git apply docs/legacy/unknown-time-noon-fallback.src-only.revert.patch

# 서버에서 이름표 받기 (다른 PC·팀원)
git fetch origin tag legacy/unknown-time-noon-fallback
```

## 주의
- `src-only` 패치는 서버·계산만 되돌린다. 화면(`사주/사주/index.html`, `사주/js/cmdg-master-teaser.js`)과 번역본(`.vercel-localized`)은 포함하지 않는다.
- 그 뒤로 코드가 더 바뀌면 패치가 적용되지 않을 수 있다. 그때는 태그를 기준으로 비교한다.
