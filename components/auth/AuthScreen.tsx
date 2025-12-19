import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface AuthScreenProps {
    onGoogleLogin: () => void;
    onEmailLogin: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onGoogleLogin, onEmailLogin }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const tl = gsap.timeline();

        // Ensure initial state
        gsap.set(containerRef.current, { opacity: 0, y: 50 });
        gsap.set(".auth-btn", { opacity: 0, y: 20 });

        // Animate Container
        tl.to(containerRef.current, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out"
        })
            // Animate Buttons
            .to(".auth-btn", {
                y: 0,
                opacity: 1,
                duration: 0.5,
                stagger: 0.1,
                ease: "back.out(1.7)"
            }, "-=0.4");

    }, { scope: containerRef });

    return (
        <div className="fixed inset-0 z-[150] bg-black overflow-hidden flex flex-col items-center justify-end pb-12 md:pb-20">
            {/* Background Video (Shared with Loading Screen for seamless feel) */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover transform scale-105"
            >
                <source src="/animation/background.mp4" type="video/mp4" />
            </video>

            {/* Dark Overlay Gradient (Bottom Heavy) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            {/* Content Container - Glassmorphism */}
            <div ref={containerRef} className="relative z-10 w-full max-w-sm px-6">

                {/* Logo/Branding (Optional - can be minimal here) */}
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-black text-white italic drop-shadow-xl tracking-wider">
                        HEX<span className="text-cyan-400">SPIN</span>
                    </h2>
                    <p className="text-gray-300 text-xs font-bold tracking-widest bg-black/30 inline-block px-3 py-1 rounded-full backdrop-blur-md mt-2 border border-white/10">
                        BATTLE ROYALE
                    </p>
                </div>

                {/* Buttons Stack */}
                <div className="space-y-4">

                    {/* GOOGLE BUTTON (Primary) */}
                    <button
                        onClick={onGoogleLogin}
                        className="auth-btn w-full bg-white hover:bg-gray-100 text-black h-14 rounded-xl font-bold text-lg shadow-lg shadow-black/20 transition-transform active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* EMAIL BUTTON (Secondary) */}
                    <button
                        onClick={onEmailLogin}
                        className="auth-btn w-full bg-white/10 hover:bg-white/20 active:bg-white/5 backdrop-blur-md border border-white/20 text-white h-12 rounded-xl font-bold text-sm transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {/* Mail Icon SVG or Component */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                        Sign in with Email
                    </button>

                </div>

                {/* Legal / Footer Text */}
                <div className="mt-8 text-center opacity-0 animate-[fadeIn_1s_ease-out_1s_forwards]">
                    <div className="flex items-center justify-center text-[10px] text-gray-500 gap-4 mb-2">
                        <button className="hover:text-gray-300">Privacy Policy</button>
                        <div className="w-[1px] h-3 bg-gray-700"></div>
                        <button className="hover:text-gray-300">Terms of Service</button>
                    </div>
                    <p className="text-[10px] text-gray-600 font-mono">
                        v2.4.0.15
                    </p>
                </div>

            </div>
        </div>
    );
};

export default AuthScreen;
