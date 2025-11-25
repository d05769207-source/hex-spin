import React, { useState } from 'react';
import { X, Shield } from 'lucide-react';

interface AdminLoginModalProps {
    onLogin: (password: string) => void;
    onClose: () => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onLogin, onClose }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Just pass the password to parent for verification
        onLogin(password);

        // If login fails, parent won't close modal, so we show error
        // This is a simple approach - parent handles actual verification
        setTimeout(() => {
            // If modal is still open after 100ms, login failed
            setError('Invalid admin password');
            setPassword('');
        }, 100);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-black border-2 border-red-500/50 rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.3)] p-6">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                        <Shield size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                        Admin Access
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Enter admin password to continue</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                            autoFocus
                        />
                        {error && (
                            <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                                <span className="text-red-500">⚠</span> {error}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!password}
                        className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] disabled:shadow-none"
                    >
                        LOGIN
                    </button>
                </form>

                {/* Footer Note */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-500 text-center">
                        🔒 Admin panel for testing purposes only
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginModal;
