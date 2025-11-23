import React, { useEffect, useState } from "react";

interface Slide {
  title: string;
  subtitle: string;
  tag: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    title: "Neon Protocol",
    subtitle: "Co-op heists in zero gravity with pulse boosts",
    tag: "New",
    accent: "linear-gradient(120deg, #0a1d3d, #18a4ff)"
  },
  {
    title: "Aether Drift",
    subtitle: "Tumble mechanics with charged multipliers",
    tag: "Exclusive",
    accent: "linear-gradient(120deg, #1c0f3b, #7cf2ff)"
  },
  {
    title: "Cyber Surge",
    subtitle: "Jackpot traces, adaptive reels, instant duels",
    tag: "Tournament",
    accent: "linear-gradient(120deg, #102231, #9bf94a)"
  }
];

const HeroCarousel: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex(prev => (prev + 1) % SLIDES.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <section className="hero-carousel" style={{ background: slide.accent }}>
      <div>
        <p className="hero-tag">{slide.tag}</p>
        <h2>{slide.title}</h2>
        <p>{slide.subtitle}</p>
        <button className="button button-primary">Play</button>
      </div>
      <div className="hero-slider-controls">
        <span>
          {index + 1} / {SLIDES.length}
        </span>
        <div className="arrows">
          <button onClick={() => setIndex((index - 1 + SLIDES.length) % SLIDES.length)}>{"<"}</button>
          <button onClick={() => setIndex((index + 1) % SLIDES.length)}>{">"}</button>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
