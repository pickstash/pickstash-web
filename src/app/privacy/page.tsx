import type { Metadata } from 'next'
import { LegalDoc, LegalSection, LegalList } from '@/components/legal-doc'

export const metadata: Metadata = { title: '개인정보처리방침 · 결정창고' }

// 시행일·운영자·보호책임자 정보는 실제 서비스 정보로 교체하세요.
const EFFECTIVE_DATE = '2026년 7월 30일'
const OPERATOR = '[운영자명]'
const OFFICER = '[개인정보 보호책임자 성명]'
const CONTACT = '[문의 이메일]'

export default function PrivacyPage() {
  return (
    <LegalDoc title="개인정보처리방침" effectiveDate={EFFECTIVE_DATE}>
      <p className="text-[13.5px] leading-relaxed text-ink-soft">
        {OPERATOR}(이하 &lsquo;회사&rsquo;)는 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등 관련
        법령을 준수합니다. 본 방침은 &lsquo;결정창고&rsquo; 서비스(이하 &lsquo;서비스&rsquo;)에서 이용자의
        개인정보가 어떻게 수집·이용·보관·파기되는지를 설명합니다.
      </p>

      <LegalSection title="1. 수집하는 개인정보 항목">
        <p>회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
        <LegalList
          items={[
            <>
              <b className="text-ink">소셜 로그인 시(필수)</b> — 회원 식별자(카카오/토스 사용자 식별키), 이름
            </>,
            <>
              <b className="text-ink">소셜 로그인 시(선택)</b> — 이메일 주소
            </>,
            <>
              <b className="text-ink">서비스 이용 과정에서 생성</b> — 이용자가 작성한 상자·선택지·링크·댓글·투표 등
              콘텐츠, 접속 로그, 기기 및 브라우저 정보, 알림 수신을 위한 푸시 토큰(동의 시)
            </>,
          ]}
        />
        <p className="text-xs text-ink-faint">
          ※ 회사는 주민등록번호, 생년월일, 성별, 연계정보(CI) 등 민감정보나 별도 식별정보를 수집하지 않습니다.
        </p>
      </LegalSection>

      <LegalSection title="2. 개인정보의 수집 및 이용 목적">
        <LegalList
          items={[
            <>회원 식별 및 로그인·계정 관리</>,
            <>서비스 제공 및 운영(상자 생성·투표·공유·알림 등)</>,
            <>이용자 문의 응대 및 공지사항 전달</>,
            <>서비스 개선 및 부정 이용 방지</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="3. 개인정보의 보유 및 이용 기간">
        <LegalList
          items={[
            <>회사는 이용자가 회원으로 있는 동안 개인정보를 보유·이용합니다.</>,
            <>이용자가 회원 탈퇴를 하거나 연동한 소셜 계정 연결을 해제한 경우, 회사는 지체 없이 해당 이용자의 개인정보 및 콘텐츠를 파기합니다. 다만, 관련 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="4. 개인정보의 제3자 제공">
        <p>
          회사는 이용자의 개인정보를 본 방침에서 고지한 범위를 넘어 제3자에게 제공하지 않습니다. 다만, 법령에 특별한
          규정이 있거나 이용자의 별도 동의가 있는 경우는 예외로 합니다.
        </p>
      </LegalSection>

      <LegalSection title="5. 개인정보 처리의 위탁">
        <p>회사는 안정적인 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
        <LegalList
          items={[
            <>Supabase (데이터베이스·인증 인프라 운영)</>,
            <>Vercel (서비스 호스팅 및 배포)</>,
            <>카카오·토스 (소셜 로그인 인증)</>,
          ]}
        />
        <p className="text-xs text-ink-faint">
          ※ 위탁받은 자는 개인정보를 위탁 목적 범위 내에서만 처리하며, 관련 법령에 따라 안전하게 관리합니다.
        </p>
      </LegalSection>

      <LegalSection title="6. 개인정보의 파기 절차 및 방법">
        <LegalList
          items={[
            <>파기 사유가 발생한 개인정보는 지체 없이 파기합니다.</>,
            <>전자적 파일 형태의 정보는 복구·재생할 수 없는 기술적 방법으로 삭제합니다.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="7. 이용자 및 법정대리인의 권리와 행사 방법">
        <LegalList
          items={[
            <>이용자는 언제든지 자신의 개인정보를 조회·수정하거나 처리 정지·삭제를 요청할 수 있습니다.</>,
            <>이용자는 서비스 내 탈퇴 기능 또는 아래 문의처를 통해 위 권리를 행사할 수 있습니다.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="8. 개인정보의 안전성 확보 조치">
        <LegalList
          items={[
            <>개인정보 접근 권한의 최소화 및 접근 통제</>,
            <>전송 구간 암호화(HTTPS) 및 인증 정보의 안전한 관리</>,
            <>개인정보 처리 시스템에 대한 접근 기록 관리</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="9. 개인정보 보호책임자">
        <p>회사는 개인정보 처리에 관한 업무를 총괄하는 보호책임자를 아래와 같이 지정하고 있습니다.</p>
        <p>
          개인정보 보호책임자: {OFFICER}
          <br />
          문의: {CONTACT}
        </p>
      </LegalSection>

      <LegalSection title="10. 개인정보처리방침의 변경">
        <p>
          본 방침은 법령·정책 또는 서비스의 변경에 따라 개정될 수 있으며, 개정 시 시행일 및 변경 내용을 서비스 내에
          공지합니다.
        </p>
      </LegalSection>

      <p className="border-t border-line pt-4 text-xs text-ink-faint">
        본 개인정보처리방침은 {EFFECTIVE_DATE}부터 시행합니다.
      </p>
    </LegalDoc>
  )
}
