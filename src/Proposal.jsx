import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* ======================
   SIMPLE SFX
====================== */
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
    } catch {}
  };

  return {
    tap: () => beep(520, 60, "sine", 0.035),
    yes: () => {
      beep(660, 70, "triangle", 0.05);
      setTimeout(() => beep(880, 90, "triangle", 0.045), 90);
    },
    no: () => beep(220, 90, "square", 0.03),
    success: () => {
      beep(523, 80, "triangle", 0.05);
      setTimeout(() => beep(659, 90, "triangle", 0.045), 110);
      setTimeout(() => beep(784, 120, "triangle", 0.04), 240);
    },
  };
}

const STEPS = {
  TRANSITION: "transition",
  LETTER: "letter",
  PROPOSE: "propose",
  TERMS: "terms",
  SIGN: "sign",
  CELEBRATE: "celebrate",
};

export default function Proposal() {
  const nav = useNavigate();
  const sfx = useBeep();

  const [step, setStep] = useState(STEPS.TRANSITION);

  /* ======================
     NO BUTTON CHAOS
  ====================== */
  const [noPos, setNoPos] = useState({ x: 58, y: 62 });
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const funnyNoLines = useMemo(
    () => [
      "Madam ji ye sahi nahi hai 😭",
      "NO ka button tumhare liye bana hi nahi 😤",
      "Rules: NO is illegal here 🚫",
      "Aayein? Baingan? 😭",
      "Bas bas drama mat karo 😅",
      "YES bol do na pls 🥺",
      "Button bhi tumse bhaag raha hai 😤",
      "System error: ONLY YES ALLOWED 😵‍💫",
      "Akhil internally crying 😭",
      "Madam ji please 😌",
    ],
    []
  );

  /* ======================
     LETTER CONTENT
  ====================== */
  const letterLines = useMemo(
    () => [
      "If love were easy, everyone would have it.",
      "But ours is special because we choose it, every day.",
      "You burn bright. I stay calm.",
      "You dream loud. I protect quietly.",
      "Like rivers finding oceans, like clouds finding rain, like hearts finding home.",
      "I know there will be days when life gets heavy, distance, misunderstandings, silence.",
      "But I will never stop trying. Never stop choosing you. Never stop loving you.",
      "Not when you’re smiling, not when you’re angry, not when you’re tired, not when you’re quiet.",
      "In every version of you… I’m in love.",
      "Ishika, ma timilai maya garchu",
    ],
    []
  );

  const terms = useMemo(
    () => [
      "Unlimited teasing 😝",
      "Unlimited food dates 🍕",
      "Unlimited hugs 🤗",
      "Unlimited kisses 😘",
      "Honesty always 💬",
      "Loyalty always ❤️",
      "Never giving up on us 💪",
      "Growing together 🌱",
      "Never let the kid inside us die 💃🕺",
      "We shall travel the world and have unlimited fun in every ups and downs",
    ],
    []
  );

  /* ======================
     FLOATING HEARTS
  ====================== */
  const floatingHearts = useMemo(() => {
    const chars = ["❤", "💗", "💖", "💘", "💞"];
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 6,
      dur: 7 + Math.random() * 7,
      size: 14 + Math.random() * 18,
      ch: chars[Math.floor(Math.random() * chars.length)],
      drift: Math.random() * 40 - 20,
      blur: Math.random() * 0.8,
      op: 0.18 + Math.random() * 0.22,
    }));
  }, []);

  /* ======================
     CONFETTI
  ====================== */
  const confetti = useMemo(
    () =>
      Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.8 + Math.random() * 2.4,
        spin: 180 + Math.random() * 520,
        size: 6 + Math.random() * 10,
      })),
    []
  );

  useEffect(() => {
    return () => toastTimer.current && clearTimeout(toastTimer.current);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    toastTimer.current && clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1400);
  };

  /* ======================
     ACTIONS
  ====================== */
  const onClickNo = () => {
    sfx.no();
    setNoPos({
      x: clamp(12 + Math.random() * 76, 10, 88),
      y: clamp(18 + Math.random() * 62, 18, 86),
    });
    showToast(funnyNoLines[Math.floor(Math.random() * funnyNoLines.length)]);
  };

  /* ======================
     SIGNATURE
  ====================== */
  const [name, setName] = useState("");
  const [signed, setSigned] = useState(false);
  const [akhilTyped, setAkhilTyped] = useState("");

  const onSubmitSignature = () => {
    sfx.tap();
    if (!name.trim()) {
      showToast("Type your name madam ji 😅");
      return;
    }

    setSigned(true);
    setAkhilTyped("");

    const full = "Akhil";
    let i = 0;
    const id = setInterval(() => {
      i++;
      setAkhilTyped(full.slice(0, i));
      if (i === full.length) clearInterval(id);
    }, 220);
  };

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="proposalRoot">
      <div className="heartsStream">
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
              "--drift": `${h.drift}px`,
            }}
          >
            {h.ch}
          </span>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <div className="proposalStage">
        {step === STEPS.TRANSITION && (
          <div className="centerStack">
            <div className="bigLine">The game is over…</div>
            <div className="bigLine">But what we played was real.</div>
            <div className="bigLine">Now… let me talk to you.</div>
            <button className="pBtn primary" onClick={() => setStep(STEPS.LETTER)}>
              Continue
            </button>
          </div>
        )}

        {step === STEPS.LETTER && (
          <div className="letterWrap">
            <div className="letterCard">
              <div className="letterTitle">To My Ishika</div>

              <div className="letterBody">
                {letterLines.map((l, i) => (
                  <p
                    key={i}
                    className={
                      i < 2
                        ? "letterHighlight"
                        : i === 2 || i === 3
                        ? "letterContrast"
                        : ""
                    }
                  >
                    {l}
                  </p>
                ))}

                <div className="letterQuestion">
                  Will you be my forever Valentine? ❤️
                </div>

                <div className="letterSign">— Akhil</div>
              </div>
            </div>

            <button className="pBtn primary" onClick={() => setStep(STEPS.PROPOSE)}>
              Next
            </button>
          </div>
        )}

        {step === STEPS.PROPOSE && (
          <div className="proposeWrap">
            <div className="proposeTitle">
              Will you be my forever Valentine?
            </div>

            <div className="proposeBtns">
              <button
                className="pBtn primary"
                onClick={() => {
                  sfx.yes();
                  setStep(STEPS.TERMS);
                }}
              >
                YES
              </button>

              <button
                className="pBtn"
                style={{
                  position: "absolute",
                  left: `${noPos.x}%`,
                  top: `${noPos.y}%`,
                }}
                onClick={onClickNo}
              >
                NO
              </button>
            </div>
          </div>
        )}

        {step === STEPS.TERMS && (
          <div className="termsWrap">
            <div className="termsTitle">
              That’s great 😌 You’ve taken the best decision
            </div>
            <div className="termsCard">
              {terms.map((t, i) => (
                <div key={i} className="termItem">
                  {t}
                </div>
              ))}
            </div>
            <button className="pBtn primary" onClick={() => setStep(STEPS.SIGN)}>
              Sign
            </button>
          </div>
        )}

        {step === STEPS.SIGN && (
          <div className="signWrap">
            {!signed ? (
              <>
                <div className="signTitle">Type your name to sign</div>
                <input
                  className="signInput"
                  placeholder="Ishika"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button className="pBtn primary" onClick={onSubmitSignature}>
                  Submit Signature
                </button>
              </>
            ) : (
              <>
                <div className="signReveal">
                  Wait… what made you think you’re alone in this?
                </div>

                <div className="sigRow">
                  <div className="sigName userSig">{name}</div>
                  <div className="sigName akhilSig">{akhilTyped}</div>
                </div>

                <div className="sigForever">Ishika ❤️ Akhil</div>
                <div className="sigForever sub">Forever</div>

                <button
                  className="pBtn primary"
                  onClick={() => {
                    sfx.success();
                    setStep(STEPS.CELEBRATE);
                  }}
                >
                  Celebrate
                </button>
              </>
            )}
          </div>
        )}

        {step === STEPS.CELEBRATE && (
          <div className="celebrateWrap">
            <div className="confetti">
              {confetti.map((c) => (
                <span
                  key={c.id}
                  className="conf"
                  style={{
                    left: `${c.left}%`,
                    animationDelay: `${c.delay}s`,
                    animationDuration: `${c.dur}s`,
                    width: `${c.size}px`,
                    height: `${c.size * 1.8}px`,
                    "--spin": `${c.spin}deg`,
                  }}
                />
              ))}
            </div>

            <div className="celebrateText">
              Contract Signed. Yahoooooooo! 🎉
              <br />
              Ishika is Akhil’s girl and Akhil is Ishika’s guy — let’s celebrate
              love!
            </div>

            <button className="replayCorner" onClick={() => nav("/")}>
              Replay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
