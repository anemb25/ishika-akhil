import { useEffect, useMemo, useRef, useState } from "react";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// Timings
const FOOD_RAIN_TOTAL_MS = 4200; // longer + slower feel
const FOOD_RAIN_STOP_MS = 4200;

const SCREEN4_REST_TO_SLEEP_MS = 3600; // 3–4 seconds
const SCREEN4_SLEEP_TO_WAKE1_MS = 6700; // 6–7 seconds after sleeping starts
const SCREEN4_WAKE1_TO_AKHIL_WHAT_MS = 2000; // Akhil appears after 2 sec
const SCREEN4_WORM_Q_TO_AKHIL_REPLY_MS = 3000; // 3 sec pause then Akhil reply
const SCREEN4_AFTER_REPLY_TO_SLEEP_MS = 2500; // (kept, but no longer used for reply auto-close)
const SCREEN4_SLEEP2_TO_WAKE2_MS = 5000; // 5 sec later wakes again
const SCREEN4_AFTER_JEALOUS_DIALOG_TO_EXPLODE_MS = 700; // small beat
const SCREEN4_EXPLODE_TOTAL_MS = 1700;

export default function App() {
  const [energy, setEnergy] = useState(100);
  const [distance, setDistance] = useState(0);
  const [worldX, setWorldX] = useState(0);

  const [walkDir, setWalkDir] = useState(0);
  const [jumping, setJumping] = useState(false);
  const [facing, setFacing] = useState("right");

  // Scene / flow
  const [scene, setScene] = useState(""); // "" | scene-sunny | scene-fire | scene-water | scene-dusk | scene-night
  const [sceneFade, setSceneFade] = useState(false);
  const [phase, setPhase] = useState("screen1"); // screen1 -> screen2 -> screen2_exit -> screen3 -> screen4

  // Dialog system
  const [paused, setPaused] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("choice"); // choice | lines
  const [lines, setLines] = useState([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Dialog context
  // screen1_akhil | energy_up | screen2_scared | screen2_takecare | screen3_dialog | screen3_cpu
  // screen4_rest | screen4_wake1 | screen4_what | screen4_wormq | screen4_reply | screen4_jealous
  const [dialogCtx, setDialogCtx] = useState("");

  // Akhil + effects
  const [showAkhil, setShowAkhil] = useState(false);
  const [akhilLeft, setAkhilLeft] = useState("52%");
  const [foodRain, setFoodRain] = useState(false);

  // Hug
  const [hugging, setHugging] = useState(false);
  const [hugHearts, setHugHearts] = useState(false);
  const [hugText, setHugText] = useState(false);

  // Screen 3 mood
  const [ishikaMood, setIshikaMood] = useState(""); // "" | angry | soft

  // Screen 4 sleep + explosion + end
  const [sleeping, setSleeping] = useState(false);
  const [bedMode, setBedMode] = useState(false); // show bedroom/bed overlay (kept, harmless)
  const [akhilExploding, setAkhilExploding] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const lastTick = useRef(performance.now());
  const lowEnergyEventFired = useRef(false);

  const energyUpEventFired = useRef(false);
  const screen2EventFired = useRef(false);

  const energyUpTimerRef = useRef(null);
  const sceneFadeTimerRef = useRef(null);

  // Screen 3 entry timer control
  const screen3EntryTimerRef = useRef(null);
  const screen3EntryArmed = useRef(false);
  const screen3DialogFired = useRef(false);

  // Screen 4 init guard
  const screen4Init = useRef(false);

  // Timers (cleanup)
  const tRefs = useRef([]);
  const pushTimer = (id) => tRefs.current.push(id);
  useEffect(() => {
    return () => {
      tRefs.current.forEach((id) => clearTimeout(id));
      tRefs.current = [];
    };
  }, []);

  // Food rain particles (slower feel: more drops, longer durations)
  const foodDrops = useMemo(() => {
    const emojis = ["🍜", "🍕", "🍫"];
    return Array.from({ length: 44 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.6,
      dur: 2.2 + Math.random() * 2.4, // slower fall
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      size: 18 + Math.random() * 16,
    }));
  }, []);

  const isWalking = walkDir !== 0;

  // Controls
  const leftDown = () => {
    if (paused || gameOver) return;
    setWalkDir(-1);
    setFacing("left");
  };
  const leftUp = () => setWalkDir((d) => (d === -1 ? 0 : d));

  const rightDown = () => {
    if (paused || gameOver) return;
    setWalkDir(1);
    setFacing("right");
  };
  const rightUp = () => setWalkDir((d) => (d === 1 ? 0 : d));

  function doJump() {
    if (paused || gameOver) return;
    if (jumping) return;
    setJumping(true);
    setEnergy((e) => clamp(e - 4, 0, 100));
    const id = setTimeout(() => setJumping(false), 520);
    pushTimer(id);
  }

  // Keyboard support
  useEffect(() => {
    const down = (e) => {
      if (paused || gameOver) return;
      const k = e.key.toLowerCase();
      if (e.key === "ArrowRight" || k === "d") {
        setWalkDir(1);
        setFacing("right");
      }
      if (e.key === "ArrowLeft" || k === "a") {
        setWalkDir(-1);
        setFacing("left");
      }
      if (e.key === "ArrowUp" || k === "w") doJump();
    };

    const up = (e) => {
      const k = e.key.toLowerCase();
      if (e.key === "ArrowRight" || k === "d")
        setWalkDir((d) => (d === 1 ? 0 : d));
      if (e.key === "ArrowLeft" || k === "a")
        setWalkDir((d) => (d === -1 ? 0 : d));
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [paused, jumping, gameOver]);

  // Main loop
  useEffect(() => {
    let raf = 0;

    const loop = (t) => {
      const dt = Math.min(40, t - lastTick.current);
      lastTick.current = t;

      if (!paused && walkDir !== 0 && !gameOver) {
        const speed = 0.25;
        const dx = walkDir * speed * dt;
        setWorldX((x) => x + dx);

        if (walkDir === 1) {
          setDistance((p) => clamp(p + 0.022 * dt, 0, 100));
          setEnergy((e) => clamp(e - 0.012 * dt, 0, 100));
        } else {
          setEnergy((e) => clamp(e - 0.006 * dt, 0, 100));
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused, walkDir, gameOver]);

  // Screen 1 trigger low energy
  useEffect(() => {
    if (phase !== "screen1") return;
    if (lowEnergyEventFired.current) return;
    if (energy <= 35) {
      lowEnergyEventFired.current = true;
      openLowEnergyChoice();
    }
  }, [energy, phase]);

  // Screen 2 trigger
  useEffect(() => {
    if (phase !== "screen2") return;
    if (screen2EventFired.current) return;
    if (energy <= 65) {
      screen2EventFired.current = true;
      openScreen2ScaredDialog();
    }
  }, [energy, phase]);

  // Screen 2 exit -> screen 3 after 5s walking
  useEffect(() => {
    if (phase !== "screen2_exit") return;
    if (paused) return;
    if (!isWalking) return;
    if (screen3EntryArmed.current) return;

    screen3EntryArmed.current = true;
    if (screen3EntryTimerRef.current)
      clearTimeout(screen3EntryTimerRef.current);

    screen3EntryTimerRef.current = setTimeout(() => {
      softSceneSwitch("scene-fire");
      setPhase("screen3");
      setIshikaMood("angry");

      if (!screen3DialogFired.current) {
        screen3DialogFired.current = true;
        openScreen3AngryDialog();
      }
    }, 5000);
  }, [phase, paused, isWalking]);

  // Screen 4 init: open dusk + rest dialog
  useEffect(() => {
    if (phase !== "screen4") return;
    if (screen4Init.current) return;

    screen4Init.current = true;

    // Reset screen4 visuals
    setSleeping(false);
    setBedMode(false);
    setAkhilExploding(false);
    setGameOver(false);
    setShowAkhil(false);
    setAkhilLeft("52%");
    setWalkDir(0);

    // Enter dusk
    softSceneSwitch("scene-dusk");

    // Pause + open Rest dialog
    setPaused(true);
    setDialogOpen(true);
    setDialogMode("lines");
    setDialogCtx("screen4_rest");

    const seq = [
      "Akhil: Long day huh…",
      "Akhil: You did so much today 🥺",
      "Akhil: Come… rest for a while",
      "Akhil: you deserve a break... waise let me take you to parlour tomorrow❤️",
      "Akhil: Now lemme massage your feet. .......",
    ];
    setLines(seq);
    setLineIndex(0);

    // Make Akhil visible during rest dialog (soft presence)
    setShowAkhil(true);
    setAkhilLeft("52%");
  }, [phase]);

  function openLowEnergyChoice() {
    setPaused(true);
    setWalkDir(0);
    setDialogOpen(true);
    setDialogMode("choice");
    setShowAkhil(false);
    setFoodRain(false);

    const cpuLine =
      "CPU : Ishika...it seems your energy is low, you need to eat something....";
    setLines([cpuLine]);
    setLineIndex(0);
    setDialogCtx("");
    startTyping(cpuLine);
  }

  function startTyping(text) {
    setTyped("");
    setIsTyping(true);
    let i = 0;

    const id = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setIsTyping(false);
      }
    }, 18);

    return () => clearInterval(id);
  }

  useEffect(() => {
    if (!dialogOpen) return;
    if (dialogMode !== "lines") return;
    const current = lines[lineIndex] ?? "";
    startTyping(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogMode, lineIndex, dialogOpen]);

  function beginAkhilSequence() {
    setDialogMode("lines");
    setShowAkhil(true);
    setAkhilLeft("52%");

    const seq = [
      "Akhil : Heyyyy",
      "Akhil : You are hungry... well let me get something before you are H-angry",
      "Akhil : I got you food, watch your fav show and eat before it turns cold......",
    ];

    setLines(seq);
    setLineIndex(0);
    setDialogCtx("screen1_akhil");
  }

  function onChoice() {
    if (isTyping) return;
    beginAkhilSequence();
  }

  function openEnergyUpDialog() {
    if (energyUpEventFired.current) return;
    energyUpEventFired.current = true;

    setPaused(true);
    setWalkDir(0);
    setDialogOpen(true);
    setDialogMode("lines");
    setShowAkhil(false);

    setLines(["Your energy is up 😊 You can continue your day."]);
    setLineIndex(0);
    setDialogCtx("energy_up");
  }

  function scheduleScene2Entry() {
    if (energyUpTimerRef.current) clearTimeout(energyUpTimerRef.current);

    energyUpTimerRef.current = setTimeout(() => {
      softSceneSwitch("scene-sunny");
      setPhase("screen2");
    }, 3500);
  }

  function softSceneSwitch(nextScene) {
    setSceneFade(true);
    if (sceneFadeTimerRef.current) clearTimeout(sceneFadeTimerRef.current);
    sceneFadeTimerRef.current = setTimeout(() => setSceneFade(false), 900);
    setScene(nextScene);
  }

  function closeDialogAndReward() {
    setDialogOpen(false);
    setShowAkhil(false);
    setPaused(false);

    // Longer, slower rain
    setFoodRain(true);

    // Energy +50
    setEnergy((e) => clamp(e + 50, 0, 100));

    const stopId = setTimeout(() => {
      setFoodRain(false);
      openEnergyUpDialog();
    }, FOOD_RAIN_STOP_MS);
    pushTimer(stopId);
  }

  function openScreen2ScaredDialog() {
    setPaused(true);
    setWalkDir(0);
    setDialogOpen(true);
    setDialogMode("lines");

    setShowAkhil(true);
    setAkhilLeft("52%");
    setHugging(false);
    setHugHearts(false);
    setHugText(false);

    const seq = [
      "Ishika: I am scared... its getting too hard... head ache... too much pressure, I feel lone",
      "Akhil: Baby, I am always here for you. What happened?",
      "Akhil: You are never lone. Whatever is bothering you, let's handle it together.",
      "Akhil: Share with me... I got you ❤️",
    ];

    setLines(seq);
    setLineIndex(0);
    setDialogCtx("screen2_scared");
  }

  function startHugCutsceneThenTakeCare() {
    setDialogOpen(false);
    setPaused(true);
    setWalkDir(0);

    setShowAkhil(true);
    setAkhilLeft("34%");

    setHugging(true);
    setHugHearts(true);
    setHugText(true);

    const h1 = setTimeout(() => {
      setHugHearts(false);
      setHugText(false);
    }, 2500);
    pushTimer(h1);

    const h2 = setTimeout(() => {
      setHugging(false);
      setDialogOpen(true);
      setDialogMode("lines");

      setLines(["Akhil: Take care... I’m always here ❤️"]);
      setLineIndex(0);
      setDialogCtx("screen2_takecare");
    }, 2800);
    pushTimer(h2);
  }

  function openScreen3AngryDialog() {
    setPaused(true);
    setWalkDir(0);
    setDialogOpen(true);
    setDialogMode("lines");
    setDialogCtx("screen3_dialog");

    setShowAkhil(false);
    setAkhilLeft("52%");

    const seq = [
      "Ishika: Akhil I am not feeling well...",
      "Ishika: I am angry on you, I am angry on everyone...",
      "Ishika: I hate this... just go away from me...",
      "Akhil: I know something is bothering you. It's okay.",
      "Akhil: Remember... you are fire and I am water, you are angry, let me cool you down",
      "Akhil: It's okay to be moody. Take care ❤️",
    ];

    setLines(seq);
    setLineIndex(0);
  }

  function openScreen3CpuDialog() {
    setPaused(true);
    setWalkDir(0);
    setDialogOpen(true);
    setDialogMode("lines");
    setDialogCtx("screen3_cpu");

    setShowAkhil(false);
    setAkhilLeft("52%");

    setLines([
      "CPU: WooW....Akhil really did something, your energy is up again.",
    ]);
    setLineIndex(0);
  }

  // Screen 3: show Akhil when Akhil lines start
  useEffect(() => {
    if (!dialogOpen) return;
    if (dialogCtx !== "screen3_dialog") return;
    if (lineIndex >= 3) {
      setShowAkhil(true);
      setAkhilLeft("52%");
    }
  }, [dialogOpen, dialogCtx, lineIndex]);

  // ---------- SCREEN 4 HELPERS ----------
  function screen4StartResting() {
    setDialogOpen(false);
    setPaused(true);
    setWalkDir(0);

    // Hide Akhil during rest-to-sleep
    setShowAkhil(false);

    // refill energy smoothly
    const start = performance.now();
    const from = energy;
    const to = 100;
    const duration = SCREEN4_REST_TO_SLEEP_MS;

    const rafId = { id: 0 };
    const step = (t) => {
      const p = clamp((t - start) / duration, 0, 1);
      setEnergy(Math.round(from + (to - from) * p));
      if (p < 1) rafId.id = requestAnimationFrame(step);
    };
    rafId.id = requestAnimationFrame(step);

    const toSleepId = setTimeout(() => {
      setEnergy(100);
      enterSleepMode(); // sleep #1
    }, SCREEN4_REST_TO_SLEEP_MS);
    pushTimer(toSleepId);
  }

  function enterSleepMode() {
    softSceneSwitch("scene-night");
    setBedMode(true);
    setSleeping(true);
    setPaused(true);
    setWalkDir(0);

    const wake1 = setTimeout(() => {
      wakeUp1();
    }, SCREEN4_SLEEP_TO_WAKE1_MS);
    pushTimer(wake1);
  }

  function wakeUp1() {
    setSleeping(false);
    setBedMode(true);
    setPaused(true);
    setShowAkhil(false);

    setDialogOpen(true);
    setDialogMode("lines");
    setDialogCtx("screen4_wake1");
    setLines(["Ishika: Akhillll....."]);
    setLineIndex(0);

    const whatId = setTimeout(() => {
      setShowAkhil(true);
      setAkhilLeft("60%");
      setDialogOpen(true);
      setDialogMode("lines");
      setDialogCtx("screen4_what");
      setLines(["Akhil: What...."]);
      setLineIndex(0);
    }, SCREEN4_WAKE1_TO_AKHIL_WHAT_MS);
    pushTimer(whatId);
  }

  function startWormDialogFlow() {
    setDialogOpen(true);
    setDialogMode("lines");
    setDialogCtx("screen4_wormq");
    setShowAkhil(true);

    setLines([
      "Ishika: you dont love me na.....",
      "Akhil: whaat!!",
      "Ishika: will you still love me if I am a worm...🐛",
      "Akhil: Huh....",
      "Ishika: In a room full of girls ...will you still look at me.......",
    ]);
    setLineIndex(0);
  }

  // ✅ FIXED: no auto timer killing the dialog
  function showAkhilWormReplyThenSleep() {
    setDialogOpen(true);
    setDialogMode("lines");
    setDialogCtx("screen4_reply");
    setShowAkhil(true);

    setLines([
      "Akhil: Uff sleep Madam ji... 😅",
      "Akhil: even if you are a worm ...you will be my worm ❤️",
      "Akhil: forget a room full of girls...even in a world full of girls, I'll only look at you....",
    ]);
    setLineIndex(0);
  }

  function wakeUp2Jealous() {
    setSleeping(false);
    setBedMode(true);
    setPaused(true);

    setShowAkhil(true);
    setAkhilLeft("60%");

    setDialogOpen(true);
    setDialogMode("lines");
    setDialogCtx("screen4_jealous");
    setLines([
      "Ishika: Wait A Minute...what are you doing in a world full of girls!!",
      "Akhil: Madam ji pleaaaase",
      "Ishika: How could you answer all so right...which girl asked you earlier... who is it.....",
    ]);
    setLineIndex(0);
  }

  function triggerExplosionAndEnd() {
    setDialogOpen(false);
    setPaused(true);

    setShowAkhil(true);
    setAkhilLeft("60%");
    setAkhilExploding(true);

    const endExplosionId = setTimeout(() => {
      setAkhilExploding(false);
      setShowAkhil(false);

      const gameOverId = setTimeout(() => {
        setGameOver(true);
        setPaused(true);
      }, 3000);

      pushTimer(gameOverId);
    }, SCREEN4_EXPLODE_TOTAL_MS);

    pushTimer(endExplosionId);
  }

  function resetGame() {
    window.location.reload();
  }

  // ---------- Continue button logic ----------
  function onContinue() {
    if (isTyping) return;

    // ✅ Special handling: screen4_reply should NOT instantly jump to sleep.
    // It must allow all 3 lines to be shown.
    if (dialogCtx === "screen4_reply") {
      if (lineIndex < lines.length - 1) {
        setLineIndex((i) => i + 1);
        return;
      }

      // last line finished → now sleep
      setDialogOpen(false);
      setSleeping(true);
      setShowAkhil(false);

      const wake2 = setTimeout(() => {
        wakeUp2Jealous();
      }, SCREEN4_SLEEP2_TO_WAKE2_MS);
      pushTimer(wake2);

      return;
    }

    if (lineIndex < lines.length - 1) {
      setLineIndex((i) => i + 1);
      return;
    }

    if (dialogCtx === "screen1_akhil") {
      closeDialogAndReward();
      return;
    }

    if (dialogCtx === "energy_up") {
      setDialogOpen(false);
      setPaused(false);
      scheduleScene2Entry();
      return;
    }

    if (dialogCtx === "screen2_scared") {
      startHugCutsceneThenTakeCare();
      return;
    }

    if (dialogCtx === "screen2_takecare") {
      setDialogOpen(false);
      setShowAkhil(false);
      setAkhilLeft("52%");
      setPaused(false);
      setPhase("screen2_exit");
      screen3EntryArmed.current = false;
      return;
    }

    if (dialogCtx === "screen3_dialog") {
      setDialogOpen(false);
      setShowAkhil(false);

      softSceneSwitch("scene-water");
      setIshikaMood("soft");
      setEnergy(100);

      const id = setTimeout(() => {
        setIshikaMood("");
        openScreen3CpuDialog();
      }, 900);
      pushTimer(id);

      return;
    }

    if (dialogCtx === "screen3_cpu") {
      setDialogOpen(false);
      setPaused(false);
      setShowAkhil(false);
      setIshikaMood("");
      setPhase("screen4");
      return;
    }

    // SCREEN 4
    if (dialogCtx === "screen4_rest") {
      return; // user must click Rest (only appears on last line)
    }

    if (dialogCtx === "screen4_wake1") {
      setDialogOpen(false);
      return;
    }

    if (dialogCtx === "screen4_what") {
      setDialogOpen(false);
      startWormDialogFlow();
      return;
    }

    if (dialogCtx === "screen4_wormq") {
      setDialogOpen(false);
      const id = setTimeout(() => {
        showAkhilWormReplyThenSleep();
      }, SCREEN4_WORM_Q_TO_AKHIL_REPLY_MS);
      pushTimer(id);
      return;
    }

    if (dialogCtx === "screen4_jealous") {
      const id = setTimeout(() => {
        triggerExplosionAndEnd();
      }, SCREEN4_AFTER_JEALOUS_DIALOG_TO_EXPLODE_MS);
      pushTimer(id);
      return;
    }

    setDialogOpen(false);
    setPaused(false);
  }

  // HUD bar color
  const barTone = energy < 30 ? "danger" : "ok";

  // ✅ Show Rest only on the LAST line of screen4_rest
  const isScreen4RestLastLine =
    dialogCtx === "screen4_rest" &&
    lineIndex === Math.max(0, lines.length - 1) &&
    !isTyping;

  return (
    <div
      className={`app ${dialogOpen ? "dimmed" : ""} ${
        gameOver ? "gameOverDim" : ""
      }`}
    >
      {/* HUD */}
      <div className="hud">
        <div className="hud-left">💖 Ishika & Akhil</div>

        <div className="hud-right">
          <div className="energyWrap">
            <div className="energyTop">
              <span className="energyLabel">Energy</span>
              <span className="energyPct">{Math.round(energy)}%</span>
            </div>

            <div className={`energyBar ${barTone}`}>
              <div className="energyFill" style={{ width: `${energy}%` }} />
            </div>
          </div>

          <span className="pill subtle">Progress: {Math.round(distance)}%</span>
        </div>
      </div>

      {/* Stage */}
      <div className={`stage ${scene}`} style={{ ["--worldX"]: `${worldX}px` }}>
        <div className="layer layer-sky" />
        <div className="layer layer-clouds" />
        <div className="layer layer-clouds2" />
        <div className="layer layer-skyline" />
        <div className="particles" />

        {(phase === "screen2" ||
          phase === "screen2_exit" ||
          phase === "screen3" ||
          phase === "screen4") && <div className="layer layer-foreground" />}

        {scene === "scene-fire" && <div className="layer layer-fire" />}
        {scene === "scene-water" && <div className="layer layer-water" />}

        {/* Bedroom overlay for Screen 4 (kept; fine if styled) */}
        {bedMode && <div className="bedroomLayer" />}

        {sceneFade && <div className="sceneFade" />}

        <div className="ground" />

        {/* ✅ Ishika: show normal sprite ONLY when not sleeping */}
        {!sleeping && (
          <div
            className={[
              "player",
              isWalking ? "walking" : "idle",
              jumping ? "jumping" : "",
              facing,
              hugging ? "hugging" : "",
              ishikaMood ? ishikaMood : "",
            ].join(" ")}
          >
            <div className="shadow"></div>

            <div className="head">
              <div className="hair"></div>

              <div className="bow">
                <div className="bow-left"></div>
                <div className="bow-center"></div>
                <div className="bow-right"></div>
              </div>

              <div className="face">
                <div className="eye left"></div>
                <div className="eye right"></div>
                <div className="blush left"></div>
                <div className="blush right"></div>
                <div className="smile"></div>
              </div>
            </div>

            <div className="torso">
              <div className="hoodieBody"></div>
              <div className="pocket"></div>
              <div className="arm left"></div>
              <div className="arm right"></div>
            </div>

            <div className="legs">
              <div className="leg left"></div>
              <div className="leg right"></div>
              <div className="shoe left"></div>
              <div className="shoe right"></div>
            </div>
          </div>
        )}

        {/* ✅ Pretty Sleep Cutscene */}
        {sleeping && (
          <div className="sleepScene">
            <div className="sleepFloor" />

            <div className="bed">
              <div className="bedHead" />
              <div className="bedMattress" />
              <div className="bedBlanket" />
              <div className="bedPillow" />

              <div className="sleepIshika">
                <div className="sleepIshikaFace">
                  <div className="sleepEye left" />
                  <div className="sleepEye right" />
                  <div className="sleepBlush" />
                </div>
              </div>
            </div>

            <div className="zzz">zzz… zZz…</div>
          </div>
        )}

        {/* Akhil */}
        {showAkhil && (
          <div
            className={`akhilWrap ${akhilExploding ? "explodeGrow" : ""}`}
            style={{ left: akhilLeft }}
          >
            <div
              className={`akhilSprite ${hugging ? "hugging" : ""} ${
                akhilExploding ? "explode" : ""
              }`}
            >
              <div className="shadow"></div>

              <div className="head">
                <div className="hair"></div>
                <div className="face">
                  <div className="eye left"></div>
                  <div className="eye right"></div>
                  <div className="smile"></div>
                </div>
              </div>

              <div className="torso">
                <div className="hoodieBody"></div>
                <div className="pocket"></div>
                <div className="arm left"></div>
                <div className="arm right"></div>
              </div>

              <div className="legs">
                <div className="leg left"></div>
                <div className="leg right"></div>
                <div className="shoe left"></div>
                <div className="shoe right"></div>
              </div>

              {akhilExploding && <div className="boomFx">💥</div>}
            </div>
          </div>
        )}

        {hugHearts && <div className="hugHearts" />}
        {hugText && <div className="hugText">hugs…</div>}

        {/* Food rain */}
        {foodRain && (
          <div className="foodRain">
            {foodDrops.map((d) => (
              <span
                key={d.id}
                className="foodDrop"
                style={{
                  left: `${d.left}%`,
                  animationDelay: `${d.delay}s`,
                  animationDuration: `${d.dur}s`,
                  fontSize: `${d.size}px`,
                }}
              >
                {d.emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className="ctrl"
          onPointerDown={leftDown}
          onPointerUp={leftUp}
          onPointerCancel={leftUp}
          onPointerLeave={leftUp}
          disabled={paused || gameOver}
        >
          ◀
        </button>

        <button
          className="ctrl"
          onPointerDown={rightDown}
          onPointerUp={rightUp}
          onPointerCancel={rightUp}
          onPointerLeave={rightUp}
          disabled={paused || gameOver}
        >
          ▶
        </button>

        <button
          className="ctrl jump"
          onClick={doJump}
          disabled={paused || gameOver}
        >
          ⬆ Jump
        </button>
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="dialogOverlay">
          <div className="dialogBox">
            <div className="dialogHeader">
              <span className="hint">Tap to continue</span>
            </div>

            <div className={`dialogText ${typed.length > 120 ? "long" : ""}`}>
              {typed}
            </div>

            {dialogMode === "choice" && (
              <div className="dialogActions">
                <button
                  className="btn primary"
                  onClick={onChoice}
                  disabled={isTyping}
                >
                  Yes
                </button>
                <button
                  className="btn primary"
                  onClick={onChoice}
                  disabled={isTyping}
                >
                  Yesssss
                </button>
              </div>
            )}

            {dialogMode === "lines" && (
              <div className="dialogActions">
                {dialogCtx === "screen4_rest" ? (
                  isScreen4RestLastLine ? (
                    <button
                      className="btn primary"
                      onClick={screen4StartResting}
                      disabled={isTyping}
                    >
                      🛌 Rest
                    </button>
                  ) : (
                    <button className="btn" onClick={onContinue} disabled={isTyping}>
                      Continue
                    </button>
                  )
                ) : (
                  <button className="btn" onClick={onContinue} disabled={isTyping}>
                    Continue
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {gameOver && (
        <div className="gameOverOverlay">
          <div className="gameOverCard">
            <div className="gameOverTitle">Game Over…</div>
            <div className="gameOverSub">or is it?</div>

            <div className="gameOverBtns">
              <button className="btn primary" onClick={resetGame}>
                🔁 Replay
              </button>
              <button
                className="btn"
                onClick={() => {
                  window.location.href = "#/proposal";
                }}
              >
                ➡ Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}