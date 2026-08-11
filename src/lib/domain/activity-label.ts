export type BoxActivityType =
  | 'option_added'
  | 'vote_cast'
  | 'comment_added'
  | 'box_closed'
  | 'box_closed_auto'
  | 'box_reopened'
  | 'rematch_started'
  | 'deadline_changed'
  | 'participant_joined'
  | 'invited'
  | 'mentioned'
  | 'join_requested'
  | 'join_approved'

export interface ActivityInfo {
  type: BoxActivityType
  actorNickname: string
  meta: { option_name?: string; vote_type?: string }
}

/** 들썩이는 상자 항목에 붙는 "누가 뭘 했는지" 한 줄 문구 */
export function formatActivity({ type, actorNickname, meta }: ActivityInfo): string {
  const who = `${actorNickname}님이`
  switch (type) {
    case 'option_added':
      return meta.option_name
        ? `${who} '${meta.option_name}' 선택지를 추가했어요`
        : `${who} 선택지를 추가했어요`
    case 'vote_cast':
      return meta.option_name
        ? `${who} '${meta.option_name}'에 투표했어요`
        : `${who} 투표했어요`
    case 'comment_added':
      return `${who} 댓글을 남겼어요`
    case 'box_closed':
      return `${who} 결정을 확정했어요`
    case 'box_closed_auto':
      return `마감돼 정리됐어요` // 자동마감 = 시스템 이벤트(사람 이름 없음)
    case 'box_reopened':
      return `${who} 상자를 다시 열었어요`
    case 'rematch_started':
      return `${who} 재투표를 시작했어요`
    case 'deadline_changed':
      return `${who} 마감 기한을 바꿨어요`
    case 'participant_joined':
      return `${who} 들어왔어요`
    case 'invited':
      return `${who} 초대했어요`
    case 'mentioned':
      return `${who} 나를 언급했어요`
    case 'join_requested':
      return `${who} 함께하기를 신청했어요`
    case 'join_approved':
      return `참여 신청이 수락됐어요` // 신청자에게 가는 타겟 알림
  }
}
