import { useEffect, useState } from "react";
import "./TypingIntro.css";

export default function TypingIntro() {
  const text = "Clash Of Coders";

  const [displayText, setDisplayText] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);

  useEffect(() => {
    let i = 0;

    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);

        setTimeout(() => {
          setShowSubtitle(true);
        }, 800);
      }
    }, 150);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="intro-container">

      {[...Array(70)].map((_, i) => (
        <span
          key={i}
          className="star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}

      <div className="content">
        <h1 className="clash-title">
          {displayText}
          <span className="cursor">|</span>
        </h1>

        {showSubtitle && (
          <p className="subtitle">
            CODE • COMPETE • CONQUER
          </p>
        )}
      </div>

    </div>
  );
}