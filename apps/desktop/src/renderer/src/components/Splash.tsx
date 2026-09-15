import splashBackground from "../../../../assets/splash-background.png";

export function Splash({ visible }: { visible: boolean }) {
  return (
    <div
      className={`splash${visible ? " splash--visible" : ""}`}
      aria-hidden={!visible}
      style={{ backgroundImage: `url(${splashBackground})` }}
    >
      <div className="splash__shade" />
      <div className="splash__wordmark" aria-label="ATOM">
        <span>AT</span><span className="splash__beam-gap" aria-hidden="true"/><span>OM</span>
      </div>
      <p>Precision laser workspace</p>
    </div>
  );
}
