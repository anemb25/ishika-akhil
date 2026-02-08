import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

function useBeep() {
  const ctxRef = useRef(null);

  const ensure = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const beep = (freq = 520, ms = 70, type = "sine", gain = 0.05) => {
    try {
      const ctx = ensure();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();

      setTimeout(() => {
        o.stop();
        o.disconnect();
        g.disconnect();
      }, ms);
    } catch {
      // audio may be blocked until user gesture
    }
  };

  return {
    tap: () => beep(520, 60, "sine", 0.035),
  };
}

export default function Intro() {
  const nav = useNavigate();
  const sfx = useBeep();

  // Same hearts stream as proposal page
  const floatingHearts = useMemo(() => {
    const chars = ["❤", "💗", "💖", "💘", "💞"];
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 6,
      dur: 7 + Math.random() * 7,
      size: 14 + Math.random() * 18,
      ch: chars[Math.floor(Math.random() * chars.length)],
      drift: (Math.random() * 40 - 20).toFixed(2),
      blur: (Math.random() * 0.8).toFixed(2),
      op: (0.18 + Math.random() * 0.22).toFixed(2),
    }));
  }, []);

  // Ensures page starts at top on mobile
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const onContinue = () => {
    sfx.tap();
    nav("#/game"); // route to your App.jsx page
  };

  return (
    <div className="introRoot">
      <div className="heartsStream" aria-hidden="true">
        {floatingHearts.map((h) => (
          <span
            key={h.id}
            className="floatHeart"
            style={{
              left: `${h.left}%`,
              animationDelay: `${h.delay}s`,
              animationDuration: `${h.dur}s`,
              fontSize: `${h.size}px`,
              opacity: h.op,
              filter: `blur(${h.blur}px)`,
              ["--drift"]: `${h.drift}px`,
            }}
          >
            {h.ch}
          </span>
        ))}
      </div>

      <div className="introStage">
        <div className="introCard">
          <div className="introTitle">Hi Ishika ❤️</div>

          <div className="introText">
            For the next <span className="emph">5 minutes</span>, just relax and
            enjoy whatever I built for you.
            <span className="softLine">No pressure. Just you and me. 🤍</span>
          </div>

          <button className="pBtn primary" onClick={onContinue}>
            Continue
          </button>

          <div className="introHint">Tap Continue when you’re ready.</div>
        </div>
      </div>
    </div>
  );
}
