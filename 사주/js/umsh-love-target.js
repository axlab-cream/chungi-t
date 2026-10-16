/*
 * 천명사주 "연애 상대" 기준. 브라우저(천명 화면)와 서버(src/report/partner-gender.ts)가 이 파일 하나를 같이 쓴다.
 * 고치려면 여기만 고친다. 서버는 import 한 뒤 globalThis.UMSHLoveTarget 으로 읽는다.
 */
(function (root) {
  'use strict'

  var LOVE_TARGETS = ['남자', '여자', '둘 다·상관없음']

  /**
   * 관계 기준 문자열. 본인 성별(selfGender)과 연애 상대(loveTarget)는 모두 "남자"/"여자" 로 받는다.
   * 같으면 동성, 다르면 이성. 본인 성별을 모르면 이성/동성을 짐작하지 않고 "관계 패턴 중심".
   * 연애 상대가 "둘 다·상관없음" 이면 성별 무관.
   */
  function orientationFromLoveTarget(selfGender, loveTarget) {
    if (loveTarget === LOVE_TARGETS[0] || loveTarget === LOVE_TARGETS[1]) {
      var relation = selfGender === LOVE_TARGETS[0] || selfGender === LOVE_TARGETS[1]
        ? (loveTarget === selfGender ? '동성' : '이성') + ' 관계 중심'
        : '관계 패턴 중심'
      return relation + ' · 연애 상대 ' + loveTarget
    }
    return '관계 패턴 중심 · 연애 상대 성별 무관'
  }

  /** 저장된 관계 기준에서 연애 상대를 되읽는다. "이성 관계 중심" 같은 예전 값에는 상대 성별이 없어 빈 문자열. */
  function loveTargetFromOrientation(orientation) {
    var value = orientation || ''
    var match = /연애 상대 (남자|여자)/.exec(value)
    if (match) return match[1]
    return value.indexOf('연애 상대 성별 무관') !== -1 ? LOVE_TARGETS[2] : ''
  }

  root.UMSHLoveTarget = {
    LOVE_TARGETS: LOVE_TARGETS,
    orientationFromLoveTarget: orientationFromLoveTarget,
    loveTargetFromOrientation: loveTargetFromOrientation,
  }
})(globalThis)
