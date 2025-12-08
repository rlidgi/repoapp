import React, { useState, useEffect } from "react";

const heroImages = [
    {
        src: "/images/garden.webp",
        label: "Fantasy landscapes",
    },
    {
        src: "/images/astro.webp",
        label: "Photorealistic Digital Art",
    },
    {
        src: "/images/castle.webp",
        label: "Medieval fantasy",
    },
    {
        src: "/images/space.webp",
        label: "Cinematic concept art"
    }
];

const PiclumoHeroSlider = () => {
    const [index, setIndex] = useState(0);

    // ⏱ Change 1500 to 1000 or 2000 to adjust time per image (ms)
    useEffect(() => {
        const id = setInterval(() => {
            setIndex((prev) => (prev + 1) % heroImages.length);
        }, 2800); // 1.5 seconds per image
        return () => clearInterval(id);
    }, []);

    const goTo = (i) => setIndex(i);

    return (
        <section className="hero-slider">
            {/* Fading slides */}
            {heroImages.map((img, i) => (
                <div
                    key={i}
                    className={
                        "hero-slider__slide" +
                        (i === index ? " hero-slider__slide--active" : "")
                    }
                >
                    <img
                        src={img.src}
                        alt={img.label}
                        className="hero-slider__image"
                    />
                    <div className="hero-slider__overlay">
                        <h1 className="hero-slider__title">{img.label}</h1>
                        <p className="hero-slider__subtitle">
                            Turn simple prompts into stunning, screen-filling visuals.
                        </p>
                    </div>
                </div>
            ))}

            {/* Dots */}
            <div className="hero-slider__dots">
                {heroImages.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goTo(i)}
                        className={
                            "hero-slider__dot" +
                            (i === index ? " hero-slider__dot--active" : "")
                        }
                        aria-label={`Show slide ${i + 1}`}
                    />
                ))}
            </div>
        </section>
    );
};

export default PiclumoHeroSlider;
