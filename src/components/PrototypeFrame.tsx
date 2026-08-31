export default function PrototypeFrame() {
  const prototypeUrl = `${import.meta.env.BASE_URL}prototype.html`

  return (
    <iframe
      id="learning-prototype-frame"
      className="prototype-frame"
      src={prototypeUrl}
      title="중2 수학 학습 프로토타입"
    />
  )
}
