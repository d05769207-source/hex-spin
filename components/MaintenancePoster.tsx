import React, { useEffect, useState } from 'react';
import { subscribeToGameStatus, GameStatus } from '../services/maintenanceService';
import './MaintenancePoster.css';

const MaintenancePoster: React.FC = () => {
    const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
    const [clickCount, setClickCount] = useState(0);

    useEffect(() => {
        const unsubscribe = subscribeToGameStatus((status) => {
            setGameStatus(status);
        });

        return () => unsubscribe();
    }, []);

    // Don't show anything if no warning or maintenance
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    if (isAdmin || !gameStatus || (!gameStatus.warningActive && !gameStatus.maintenanceMode && gameStatus.readyCountdown === 0)) {
        return null;
    }



    const handleEmergencyLogin = () => {
        const newCount = clickCount + 1;
        setClickCount(newCount);

        if (newCount >= 5) {
            const password = prompt("🚨 EMERGENCY ADMIN LOGIN 🚨\nEnter Password:");
            const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'pj.pj';

            if (password === correctPassword) {
                sessionStorage.setItem('isAdmin', 'true');
                window.location.reload(); // Reload to apply Admin Bypass
            } else if (password) {
                alert("Wrong Password!");
                setClickCount(0);
            }
        }
    };

    return (
        <div className="maintenance-poster-overlay">
            <div className="maintenance-poster">
                {/* Warning Phase (15s before maintenance) */}
                {gameStatus.warningActive && (
                    <>
                        <div className="maintenance-icon warning-icon">⚠️</div>
                        <h1 className="maintenance-title">WINNERS ANNOUNCEMENT</h1>
                        <h2 className="maintenance-subtitle">IN {gameStatus.warningCountdown} SECONDS</h2>
                        <p className="maintenance-message">
                            Last chance to spin! 🎰<br />
                            Make your final moves!
                        </p>
                        <div className="countdown-circle">
                            <div className="countdown-number">{gameStatus.warningCountdown}</div>
                        </div>
                    </>
                )}

                {/* Maintenance Phase */}
                {gameStatus.maintenanceMode && gameStatus.readyCountdown === 0 && (
                    <>
                        <div
                            className="maintenance-icon"
                            onClick={handleEmergencyLogin}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            title="Admin: Tap 5 times to force login"
                        >
                            🛠️
                        </div>
                        <h1 className="maintenance-title">MAINTENANCE IN PROGRESS</h1>
                        <div className="maintenance-status">
                            <div className="status-item">
                                <span className="status-icon">🏆</span>
                                <span>Calculating Winners...</span>
                            </div>
                            <div className="status-item">
                                <span className="status-icon">💎</span>
                                <span>Distributing Rewards...</span>
                            </div>
                            <div className="status-item">
                                <span className="status-icon">🔄</span>
                                <span>Resetting Data...</span>
                            </div>
                        </div>
                        <p className="maintenance-message">
                            Stay tuned! 🎉<br />
                            The game will resume shortly
                        </p>
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                        </div>
                    </>
                )}

                {/* Ready Countdown Phase (15s after maintenance) */}
                {gameStatus.readyCountdown > 0 && (
                    <>
                        <div className="maintenance-icon ready-icon">🎊</div>
                        <h1 className="maintenance-title">NEW WEEK STARTING!</h1>
                        <h2 className="maintenance-subtitle">Get Ready to Win! 🏆</h2>
                        <p className="maintenance-message">
                            Fresh start, new opportunities<br />
                            May luck be with you!
                        </p>
                        <div className="countdown-circle ready">
                            <div className="countdown-number">{gameStatus.readyCountdown}</div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MaintenancePoster;
