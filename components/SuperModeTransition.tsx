import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface Props {
    onComplete: () => void;
}

const SuperModeTransition: React.FC<Props> = ({ onComplete }) => {
    const container = useRef<HTMLDivElement>(null);
    const sphere = useRef<HTMLDivElement>(null);
    const textTitle = useRef<HTMLHeadingElement>(null);
    const textSubtitle = useRef<HTMLSpanElement>(null);
    const fog = useRef<HTMLDivElement>(null);
    const particles = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const tl = gsap.timeline({
            onComplete: () => {
                // Fade out the whole container at the end
                gsap.to(container.current, {
                    opacity: 0,
                    duration: 0.8,
                    onComplete: onComplete
                });
            }
        });

        // 1. Initial State: Yellow Sphere Center, Foggy
        tl.set(sphere.current, { scale: 1, backgroundColor: '#fbbf24', boxShadow: '0 0 50px #f59e0b' })
            .set(fog.current, { opacity: 1 })
            .set([textTitle.current, textSubtitle.current], { opacity: 0, y: 50 });

        // 2. ZOOM + COLOR SHIFT SEQUENCE
        tl.to(sphere.current, {
            scale: 50, // Massive Zoom (fills screen)
            duration: 2.5,
            ease: "expo.inOut",
        })
            .to(sphere.current, {
                backgroundColor: '#0ea5e9', // Shift to Sky Blue (cyan-500)
                boxShadow: '0 0 100px #22d3ee', // Cyan Glow
                duration: 1.5,
                ease: "power2.inOut"
            }, "-=2.0"); // Start color shift WHILE zooming

        // 3. FOG CLEARING (Dhund saaf)
        tl.to(fog.current, {
            opacity: 0,
            duration: 1.5,
            ease: "power2.inOut"
        }, "-=1.0");

        // 4. TEXT REVEAL (Impact)
        tl.to(textTitle.current, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: "back.out(1.7)"
        }, "-=0.5");

        tl.to(textSubtitle.current, {
            opacity: 1,
            y: 0,
            scale: 1.2, // Slightly larger
            duration: 0.8,
            ease: "elastic.out(1, 0.5)"
        }, "-=0.6");

        // 5. Hold for effect
        tl.to({}, { duration: 2.5 });

    }, { scope: container });

    return (
        <div ref={container} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden perspective-1000">
            {/* The Sphere (Gola) */}
            <div
                ref={sphere}
                className="absolute w-12 h-12 md:w-20 md:h-20 rounded-full"
                style={{ willChange: 'transform, background-color' }}
            ></div>

            {/* Fog Layer */}
            <div
                ref={fog}
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(255,255,255,0) 0%, rgba(200,230,255,0.4) 100%)',
                    backdropFilter: 'blur(8px)'
                }}
            ></div>

            {/* Content Layer */}
            <div className="relative z-10 text-center flex flex-col items-center gap-2 md:gap-4 mix-blend-overlay">
                <h1 ref={textTitle} className="text-4xl md:text-6xl font-black text-white tracking-widest drop-shadow-lg">
                    WELCOME TO
                </h1>
                <span ref={textSubtitle} className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-cyan-500 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)] filter brightness-125">
                    SUPER MODE
                </span>
            </div>
        </div>
    );
};

export default SuperModeTransition;
