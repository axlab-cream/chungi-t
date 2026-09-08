/**
 * 사용자가 고칠 수 있는 입력 문제와 서버 잘못을 가른다.
 *
 * 입력 파서들은 '현재 관계 상태를 선택해 주세요.'처럼 사용자에게 그대로 보여 줄 문장을
 * 던져 왔는데, 라우트의 catch 가 그것을 전부 500 으로 내렸다. 화면은 500 을 '서버 오류,
 * 잠시 후 다시'로 다루고 오류 집계도 서버 장애로 세기 때문에, 사용자는 어느 칸을 고쳐야
 * 하는지 모르고 실제 장애는 이 소음에 묻힌다.
 */
export class InputError extends Error {
  readonly status = 400

  constructor(message: string) {
    super(message)
    this.name = 'InputError'
  }
}

export function isInputError(error: unknown): error is InputError {
  return error instanceof InputError
}

/**
 * 요청 처리 실패의 공통 응답. 입력 문제는 400 으로, 그 밖은 기존 문구와 함께 500 으로
 * 내린다. 입력 오류를 던지지 않는 경로의 동작은 이전과 같다.
 */
export function respondRequestFailure(
  res: { status: (code: number) => { json: (body: unknown) => void } },
  error: unknown,
  fallbackMessage: string,
): void {
  if (isInputError(error)) {
    res.status(400).json({ code: 'INPUT_REQUIRED', error: error.message })
    return
  }
  res.status(500).json({ error: error instanceof Error ? error.message : fallbackMessage })
}
