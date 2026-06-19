import { useState, useEffect } from "react";

export default function AnimatedTitle() {
  const text = "Clash of Coders";
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let index = 0;

    const timer = setInterval(() => {
      setDisplayText(text.slice(0, index + 1));
      index++;

      if (index === text.length) {
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, []);

  return (
    <h1
      style={{
        fontFamily: "'Alex Brush', cursive",
        fontSize: "5rem",
        color: "#facc15",
        textAlign: "center",
        textShadow: "0 0 20px rgba(250,204,21,0.8)"
      }}
    >
      {displayText}
      <span className="cursor">|</span>
    </h1>
  );
}