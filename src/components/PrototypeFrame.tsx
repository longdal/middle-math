/**
 * 현재 검증된 HTML 학습 프로토타입을 그대로 실행합니다.
 * GitHub Pages의 /middle-math/ base path에서도 정상 동작하도록
 * Vite BASE_URL을 사용합니다.
 */
export default function PrototypeFrame() {
  const prototypeUrl = `${import.meta.env.BASE_URL}prototype.html`

  return (
    <iframe
      className="prototype-frame"
      src={prototypeUrl}
      title="중2 수학 심화 학습 프로토타입"
    />
  )
}
