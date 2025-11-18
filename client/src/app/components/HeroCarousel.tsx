import React, { useEffect, useState } from "react";

interface Slide {
  title: string;
  subtitle: string;
  tag: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    title: "Kawaii Princess",
    subtitle: "Royal adventure with daily boosters",
    tag: "New",
    accent: "linear-gradient(120deg, #1a1b6b, #7420a6)"
  },
  {
    title: "Lightning Crush",
    subtitle: "High-voltage reels and instant jackpots",
    tag: "Exclusive",
    accent: "linear-gradient(120deg, #0f1f3f, #0958d2)"
  },
  {
    title: "Aviator Rush",
    subtitle: "Climb the leaderboard before time runs out",
    tag: "Tournament",
    accent: "linear-gradient(120deg, #2a0b1a, #c61145)"
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
          <button onClick={() => setIndex((index - 1 + SLIDES.length) % SLIDES.length)}>‹</button>
          <button onClick={() => setIndex((index + 1) % SLIDES.length)}>›</button>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
