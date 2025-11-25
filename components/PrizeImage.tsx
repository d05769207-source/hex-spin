
import React from 'react';

interface PrizeImageProps {
    prize: 'KTM' | 'iPhone';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    glow?: boolean;
}

const PrizeImage: React.FC<PrizeImageProps> = ({ prize, size = 'md', glow = true }) => {
    const sizes = {
        sm: 'w-12 h-12',
        md: 'w-16 h-16',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32'
    };

    const glowClass = glow ? (
        prize === 'KTM'
            ? 'drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]'
            : 'drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]'
    ) : '';

    return (
        <img
            src={prize === 'KTM' ? '/images/ktm_bike.png' : '/images/iphone.png'}
            alt={prize === 'KTM' ? 'KTM Bike' : 'iPhone'}
            className={`${sizes[size]} object-contain ${glowClass}`}
        />
    );
};

export default PrizeImage;
