import React from 'react';
import { Shield, LogOut } from 'lucide-react';

interface AdminBadgeProps {
    onLogout: () => void;
}

const AdminBadge: React.FC<AdminBadgeProps> = ({ onLogout }) => {
    return (
        <div
            onClick={onLogout}
            className="fixed top-20 right-4 md:right-28 z-[9998] cursor-pointer group"
            title="Click to exit admin mode"
        >
            <div className="relative bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2 rounded-lg border-2 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.6)] hover:shadow-[0_0_30px_rgba(239,68,68,0.8)] transition-all">

                {/* Pulsing Glow Effect */}
                <div className="absolute inset-0 bg-red-500/30 rounded-lg animate-pulse"></div>

                {/* Content */}
                <div className="relative flex items-center gap-2">
                    <Shield size={18} className="text-white animate-pulse" />
                    <span className="text-white font-black text-sm uppercase tracking-wider">
                        Admin Mode
                    </span>
                    <LogOut size={16} className="text-white/70 group-hover:text-white transition-colors" />
                </div>

                {/* Tooltip on Hover */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-3 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Click to logout
                </div>
            </div>
        </div>
    );
};

export default AdminBadge;
