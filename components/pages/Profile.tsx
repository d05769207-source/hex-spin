import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Settings, Edit, ExternalLink, Share2, LogOut, ArrowRight, Minus, Plus, X, Camera, Trophy, Lock, CheckCircle, RefreshCw, Copy } from 'lucide-react';
import { User } from '../../types';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Cropper from 'react-easy-crop';
import EToken from '../EToken';
import KTMToken from '../KTMToken';
import IPhoneToken from '../iPhoneToken';
import SpinToken from '../SpinToken';
import { getLevelProgress } from '../../utils/levelUtils';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { syncUserToLeaderboard } from '../../services/leaderboardService';

// Define Area type for crop
type Area = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dbynnzumd';
const CLOUDINARY_UPLOAD_PRESET = 'profile_photos';

// File validation constants
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface ProfileProps {
  onBack: () => void;
  coins: number;
  tokens: number;
  eTokens: number;
  user: User | null;
  onLogout: () => void;
  onExchange: (amount: number) => boolean;
  onRedeemToken?: (amount: number) => boolean;
  onETokenToSpin?: (amount: number) => boolean;
  onRedeemKTM?: () => boolean;
  onRedeemIPhone?: () => boolean;
  inrBalance?: number;
  ktmTokens?: number;
  iphoneTokens?: number;
  initialTab?: 'PROFILE' | 'REDEEM' | 'LEVEL';
}

const Profile: React.FC<ProfileProps> = ({ onBack, coins, tokens, eTokens, user, onLogout, onExchange, onRedeemToken, onETokenToSpin, onRedeemKTM, onRedeemIPhone, inrBalance, ktmTokens = 0, iphoneTokens = 0, initialTab = 'PROFILE' }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [exchangeAmount, setExchangeAmount] = useState(1);
  const [exchangeError, setExchangeError] = useState('');
  const [exchangeMode, setExchangeMode] = useState<'COIN_TO_TOKEN' | 'TOKEN_TO_SPIN' | 'TOKEN_TO_INR' | 'KTM_TO_INR' | 'IPHONE_TO_INR'>('COIN_TO_TOKEN');
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'REDEEM' | 'LEVEL'>(initialTab);

  // Update active tab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [photoPreview, setPhotoPreview] = useState<string>(user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const MAX_EXCHANGE = Math.floor(coins / 1000);



  // Calculate Level Data
  const levelData = getLevelProgress(user?.totalSpins || 0);
  const currentLevel = levelData.currentLevel;

  // Get User Rank
  const { userRank } = useLeaderboard(user?.uid || user?.id);

  useEffect(() => {
    if (showExchangeModal) {
      setExchangeAmount(1);
      setExchangeError('');
    }
  }, [showExchangeModal]);

  // Update photo preview when user.photoURL changes
  useEffect(() => {
    if (user?.photoURL) {
      setPhotoPreview(user.photoURL);
    }
  }, [user?.photoURL]);

  const handleConfirmExchange = () => {
    if (exchangeAmount < 1) return;

    if (exchangeMode === 'COIN_TO_TOKEN') {
      const success = onExchange(exchangeAmount);
      if (success) {
        setShowExchangeModal(false);
      } else {
        setExchangeError('Insufficient Coins');
      }
    } else if (exchangeMode === 'TOKEN_TO_SPIN') {
      if (onETokenToSpin) {
        const success = onETokenToSpin(exchangeAmount);
        if (success) {
          setShowExchangeModal(false);
        } else {
          setExchangeError('Insufficient E-Tokens');
        }
      }
    } else if (exchangeMode === 'KTM_TO_INR') {
      if (onRedeemKTM) {
        const success = onRedeemKTM();
        if (success) {
          setShowExchangeModal(false);
        } else {
          setExchangeError('Insufficient KTM Tokens');
        }
      }
    } else if (exchangeMode === 'IPHONE_TO_INR') {
      if (onRedeemIPhone) {
        const success = onRedeemIPhone();
        if (success) {
          setShowExchangeModal(false);
        } else {
          setExchangeError('Insufficient iPhone Tokens');
        }
      }
    } else {
      // TOKEN_TO_INR (Coming Soon - but keeping logic just in case)
      if (onRedeemToken) {
        const success = onRedeemToken(exchangeAmount);
        if (success) {
          setShowExchangeModal(false);
        } else {
          setExchangeError('Insufficient Tokens');
        }
      }
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `Image must be less than ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB` };
    }

    return { valid: true };
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to desired output size (500x500 for profile photo)
    canvas.width = 500;
    canvas.height = 500;

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      500,
      500
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setSelectedFile(null);
      return;
    }

    // Clear error
    setUploadError('');

    // Store file for upload
    setSelectedFile(file);

    // Load image for cropping
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
      setShowCropModal(true);
      setShowEditModal(false); // Hide edit modal while cropping
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      // Get cropped image blob
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      // Convert blob to file
      const croppedFile = new File([croppedBlob], selectedFile?.name || 'cropped-photo.jpg', {
        type: 'image/jpeg',
      });

      // Update selected file
      setSelectedFile(croppedFile);

      // Show preview
      const previewUrl = URL.createObjectURL(croppedBlob);
      setPhotoPreview(previewUrl);

      // Close crop modal and show edit modal
      setShowCropModal(false);
      setShowEditModal(true);

      // Reset crop states
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (error) {
      console.error('Crop error:', error);
      setUploadError('Failed to crop image. Please try again.');
    }
  };

  const uploadPhotoToCloudinary = async (file: File, userId: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `users/${userId}`);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedFile) {
      setShowEditModal(false);
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      // Upload to Cloudinary
      const photoURL = await uploadPhotoToCloudinary(selectedFile, user?.uid || user?.id || 'guest');

      console.log('Photo uploaded to Cloudinary:', photoURL);
      console.log('User object:', user);

      // Save to Firestore if user is logged in
      if (user && !user.isGuest) {
        try {
          // Use user.id (document ID) instead of user.uid
          const userId = user.id || user.uid;
          if (userId) {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
              photoURL: photoURL
            });
            console.log('Photo URL saved to Firestore for user:', userId);

            // SYNC TO LEADERBOARD IMMEDIATELY
            await syncUserToLeaderboard(
              userId,
              user.username || 'Player',
              user.coins || 0,
              photoURL, // New Photo
              user.totalSpins || 0,
              getLevelProgress(user.totalSpins || 0).currentLevel
            );
            console.log('Photo URL synced to Leaderboard');
          }
        } catch (firestoreError) {
          console.error('Firestore save error:', firestoreError);
          // Don't fail the whole operation if Firestore save fails
        }
      }

      // Update local state
      setPhotoPreview(photoURL);

      // Close modal
      setShowEditModal(false);
      setShowSettings(false);
      setSelectedFile(null);

    } catch (error: any) {
      const errorMessage = error.code === 'storage/unauthorized'
        ? 'Permission denied. Please login again.'
        : error.code === 'storage/quota-exceeded'
          ? 'Storage limit reached. Contact support.'
          : 'Failed to upload photo. Please try again.';

      setUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Generate levels data
  const levels = Array.from({ length: 100 }, (_, i) => {
    const level = i + 1;
    let reward = '10 Coins';
    if (level % 10 === 0) reward = '100 Coins';
    if (level % 5 === 0 && level % 10 !== 0) reward = '50 Coins';
    if (level === 100) reward = '1000 Coins + Trophy';

    return { level, reward };
  });

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 relative">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-50">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white transition-colors">
          <ArrowLeft size={20} />
        </button>

        {/* Tabs in Header */}
        <div className="flex bg-black/40 rounded-full p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('LEVEL')}
            className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'LEVEL' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            Level
          </button>
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'PROFILE' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('REDEEM')}
            className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'REDEEM' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            Redeem
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-yellow-500 text-black' : 'bg-white/5 hover:bg-white/10 text-white'}`}
          >
            <Settings size={20} />
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
              <div className="p-2 space-y-1">
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Settings
                </div>

                {/* Edit Profile Option */}
                <button
                  onClick={() => {
                    setShowEditModal(true);
                    setShowSettings(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-bold"
                >
                  <Edit size={16} />
                  Edit Profile
                </button>

                {/* Separator */}
                <div className="h-px bg-white/10 my-1"></div>

                {/* Logout / Reset Guest Data */}
                {user && !user.isGuest ? (
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors text-sm font-bold"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                ) : (
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-3 text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-bold"
                  >
                    <LogOut size={16} />
                    Reset Guest Data
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'PROFILE' && (
        <>
          {/* New Compact Header */}
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 mb-6 relative overflow-hidden" onClick={() => setShowSettings(false)}>
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex items-center justify-between relative z-10">

              {/* Left: Photo & Level */}
              <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full animate-pulse-fast blur-sm opacity-50"></div>
                  <div className="relative w-full h-full rounded-full border-2 border-yellow-400 overflow-hidden bg-gray-800">
                    <img src={photoPreview} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-sm uppercase tracking-wider">
                    LVL {currentLevel}
                  </div>
                </div>
              </div>

              {/* Middle: Name & UID */}
              <div className="flex-1 flex flex-col justify-center px-4 border-r border-white/10">
                <h3 className="text-xl font-black text-white truncate max-w-[200px] uppercase tracking-wide drop-shadow-md">
                  {user.username || 'Guest Player'}
                </h3>

                {/* UID Display with Copy */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="bg-black/40 border border-white/10 rounded px-2 py-0.5 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">UID:</span>
                    <span className="text-xs text-yellow-500 font-mono font-bold">
                      {user.displayId ? user.displayId : '---'}
                    </span>
                  </div>
                  {user.displayId ? (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.displayId?.toString() || '');
                        // Optional: Show toast
                      }}
                      className="p-1 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                      title="Copy UID"
                    >
                      <Copy size={12} />
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        // Manual trigger for ID generation
                        try {
                          const { ensureUserHasDisplayId } = await import('../../services/userService');
                          const updatedUser = await ensureUserHasDisplayId(user);
                          if (updatedUser.displayId) {
                            // Force reload or update parent state (simplest is to alert user to reload for now, or we can try to update local state if we had a setter)
                            alert('UID Generated! Please reload the app to see it.');
                            window.location.reload();
                          }
                        } catch (e) {
                          console.error(e);
                          alert('Failed to generate UID. Check console.');
                        }
                      }}
                      className="px-2 py-0.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded text-[10px] text-yellow-500 font-bold transition-colors"
                    >
                      GENERATE
                    </button>
                  )}
                </div>

                {/* Level Progress Bar */}
                <div className="w-full mt-2">
                  <div className="flex justify-between text-[8px] text-gray-400 mb-0.5">
                    <span>Lvl {currentLevel}</span>
                    <span>{Math.floor(levelData.progress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                      style={{ width: `${levelData.progress}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-gray-500 mt-0.5 text-right">
                    {levelData.spinsInLevel} / {levelData.spinsNeededForLevel} to Lvl {levelData.nextLevel}
                  </p>
                </div>
              </div>

              {/* Right: Stats */}
              <div className="flex flex-col gap-2 pl-4">
                <div className="flex flex-col items-end">
                  <span className="text-white font-bold text-xs">{user?.totalSpins || 0}</span>
                  <span className="text-gray-500 text-[8px] uppercase tracking-wider">Spins</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-yellow-400 font-bold text-xs">
                    {userRank > 0 ? `#${userRank}` : '-'}
                  </span>
                  <span className="text-gray-500 text-[8px] uppercase tracking-wider">Rank</span>
                </div>
              </div>

            </div>
          </div>

          {/* Coins & Tokens Row */}
          <div className="grid grid-cols-2 gap-3 mb-6" onClick={() => setShowSettings(false)}>
            <div className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Coins</span>
                <span className="text-yellow-400 font-bold text-xl drop-shadow-sm">{coins.toLocaleString()}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                <span className="text-lg">💰</span>
              </div>
            </div>
            <div className="bg-gray-900/60 border border-green-500/20 rounded-xl p-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Rupees</span>
                <span className="text-green-400 font-bold text-xl drop-shadow-sm">₹{inrBalance?.toLocaleString() || 0}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                <span className="text-lg text-green-500 font-bold">₹</span>
              </div>
            </div>
          </div>

          {/* Recent Wins */}
          <div className="flex-1 bg-black/20 rounded-xl p-4 border border-white/5 mb-6 overflow-y-auto" onClick={() => setShowSettings(false)}>
            <h4 className="text-gray-400 text-xs font-bold uppercase mb-4 tracking-widest">Recent Activity</h4>
            <div className="space-y-3">
              {[
                { name: '500 Coins', time: '2 hours ago', color: 'text-yellow-400' },
                { name: '100 Coins', time: '5 hours ago', color: 'text-yellow-200' },
                { name: '20 Coins', time: '1 day ago', color: 'text-gray-300' },
              ].map((win, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/30">
                      <span className="text-lg">🏆</span>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${win.color}`}>{win.name}</p>
                      <p className="text-[10px] text-gray-500">Wheel Spin</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500">{win.time}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'LEVEL' && (
        <div className="flex-1 flex flex-col animate-in slide-in-from-left duration-300 overflow-hidden">



          <div className="flex-1 overflow-y-auto pl-4 pr-2 space-y-0 relative">

            {/* Vertical Line Background */}
            <div className="absolute left-[2.5rem] top-4 bottom-0 w-0.5 bg-white/10 z-0"></div>

            {levels.map((item, index) => {
              const isCompleted = item.level < currentLevel;
              const isCurrent = item.level === currentLevel;
              const isLocked = item.level > currentLevel;

              return (
                <div key={item.level} className={`flex items-center gap-3 mb-3 relative z-10 ${isCompleted ? 'opacity-50 grayscale' : ''}`}>

                  {/* Level Circle */}
                  <div className={`
                    w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center border-2 font-black text-sm shadow-lg relative
                    ${isCurrent
                      ? 'bg-red-600 border-red-400 text-white shadow-red-600/30 scale-110'
                      : isCompleted
                        ? 'bg-gray-800 border-gray-700 text-gray-500'
                        : 'bg-gray-900 border-red-900/50 text-red-700'
                    }
                  `}>
                    {isCompleted ? <CheckCircle size={16} /> : item.level}

                    {/* Current Level Indicator */}
                    {isCurrent && (
                      <div className="absolute -bottom-1.5 bg-white text-red-600 text-[6px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                        Current
                      </div>
                    )}
                  </div>

                  {/* Connector Line (Horizontal) */}
                  <div className={`h-0.5 w-4 ${isCompleted ? 'bg-gray-700' : isCurrent ? 'bg-red-500' : 'bg-white/10'}`}></div>

                  {/* Reward Box */}
                  <div className={`
                    flex-1 p-2 rounded-lg border flex items-center justify-between relative overflow-hidden
                    ${isCurrent
                      ? 'bg-gradient-to-r from-red-900/40 to-black border-red-500/50'
                      : isCompleted
                        ? 'bg-gray-900/50 border-gray-800'
                        : 'bg-black/40 border-white/5'
                    }
                  `}>
                    {/* Background Pattern */}
                    {isCurrent && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>}

                    <div className="flex items-center gap-2 z-10">
                      <div className={`
                        w-8 h-8 rounded-md flex items-center justify-center
                        ${isCurrent ? 'bg-red-500/20 text-red-400' : isCompleted ? 'bg-gray-800 text-gray-600' : 'bg-white/5 text-gray-500'}
                      `}>
                        {item.level === 100 ? <Trophy size={14} /> : <span className="text-sm">🎁</span>}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? 'text-green-400' : 'text-gray-400'}`}>
                          {isCurrent ? 'Auto Claim' : 'Reward'}
                        </span>
                        <span className={`text-xs font-black ${isCurrent ? 'text-red-400' : 'text-gray-500'}`}>
                          {item.reward}
                        </span>
                      </div>
                    </div>

                    {isLocked && <Lock size={12} className="text-gray-700" />}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'REDEEM' && (
        <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300 overflow-y-auto pb-20">

          {/* Wallet Dashboard */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {/* E-Tokens Card */}
            <div className="bg-gray-900/80 border border-red-500/30 rounded-xl p-1.5 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-red-500/5"></div>
              <span className="text-[9px] text-gray-400 uppercase font-bold z-10">E-Tokens</span>
              <div className="flex items-center gap-1 z-10 mt-0.5">
                <EToken size={14} />
                <span className="text-white font-black text-xs md:text-sm">{eTokens}</span>
              </div>
            </div>

            {/* INR Card */}
            <div className="bg-gray-900/80 border border-green-500/30 rounded-xl p-1.5 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-green-500/5"></div>
              <span className="text-[9px] text-gray-400 uppercase font-bold z-10">Rupees</span>
              <div className="flex items-center gap-1 z-10 mt-0.5">
                <span className="text-green-500 font-bold text-xs md:text-sm">₹</span>
                <span className="text-white font-black text-xs md:text-sm">{inrBalance?.toLocaleString() || 0}</span>
              </div>
            </div>

            {/* KTM Tokens Card */}
            <div className="bg-gray-900/80 border border-orange-500/30 rounded-xl p-1.5 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-orange-500/5"></div>
              <span className="text-[9px] text-gray-400 uppercase font-bold z-10">KTM</span>
              <div className="flex items-center gap-1 z-10 mt-0.5">
                <KTMToken size={16} />
                <span className="text-white font-black text-xs md:text-sm">{ktmTokens}</span>
              </div>
            </div>

            {/* iPhone Tokens Card */}
            <div className="bg-gray-900/80 border border-blue-500/30 rounded-xl p-1.5 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/5"></div>
              <span className="text-[9px] text-gray-400 uppercase font-bold z-10">iPhone</span>
              <div className="flex items-center gap-1 z-10 mt-0.5">
                <IPhoneToken size={16} />
                <span className="text-white font-black text-xs md:text-sm">{iphoneTokens}</span>
              </div>
            </div>
          </div>

          {/* Active Exchanges List */}
          <div className="space-y-3 mb-8">
            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-2 pl-1">Active Exchanges</h3>

            {/* 1. Coins -> E-Tokens */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group"
              onClick={() => {
                setExchangeMode('COIN_TO_TOKEN');
                setShowExchangeModal(true);
              }}
            >
              <div className="flex items-center gap-4">
                {/* Composite Icon */}
                <div className="flex items-center bg-black/20 rounded-full p-1 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                    <span className="text-lg">💰</span>
                  </div>
                  <RefreshCw size={12} className="text-gray-500 mx-1 group-hover:rotate-180 transition-all duration-500" />
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                    <EToken size={16} />
                  </div>
                </div>

                <div className="flex flex-col">
                  <h4 className="text-white font-bold text-xs">Exchange Coins</h4>
                  <p className="text-yellow-500/80 text-[10px] font-medium">1000 Coins = 1 E-Token</p>
                </div>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                <ArrowRight size={16} className="text-gray-400" />
              </div>
            </div>

            {/* 2. E-Tokens -> P-Tokens */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group"
              onClick={() => {
                setExchangeMode('TOKEN_TO_SPIN');
                setShowExchangeModal(true);
              }}
            >
              <div className="flex items-center gap-4">
                {/* Composite Icon */}
                <div className="flex items-center bg-black/20 rounded-full p-1 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                    <EToken size={16} />
                  </div>
                  <RefreshCw size={12} className="text-gray-500 mx-1 group-hover:rotate-180 transition-all duration-500" />
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
                    <SpinToken size={16} />
                  </div>
                </div>

                <div className="flex flex-col">
                  <h4 className="text-white font-bold text-xs">Get Spin Tokens</h4>
                  <p className="text-cyan-400 text-[10px] font-medium">1 E-Token = 1 Spin Token</p>
                </div>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                <ArrowRight size={16} className="text-gray-400" />
              </div>
            </div>

            {/* 3. KTM -> INR */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group"
              onClick={() => {
                setExchangeMode('KTM_TO_INR');
                setShowExchangeModal(true);
              }}
            >
              <div className="flex items-center gap-4">
                {/* Composite Icon */}
                <div className="flex items-center bg-black/20 rounded-full p-1 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/50">
                    <KTMToken size={16} />
                  </div>
                  <RefreshCw size={12} className="text-gray-500 mx-1 group-hover:rotate-180 transition-all duration-500" />
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                    <span className="text-lg text-green-500 font-bold">₹</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <h4 className="text-white font-bold text-xs">Redeem KTM</h4>
                  <p className="text-green-400 text-[10px] font-bold">Value: ₹3,40,000</p>
                </div>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                <ArrowRight size={16} className="text-gray-400" />
              </div>
            </div>

            {/* 4. iPhone -> INR */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer group"
              onClick={() => {
                setExchangeMode('IPHONE_TO_INR');
                setShowExchangeModal(true);
              }}
            >
              <div className="flex items-center gap-4">
                {/* Composite Icon */}
                <div className="flex items-center bg-black/20 rounded-full p-1 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                    <IPhoneToken size={16} />
                  </div>
                  <RefreshCw size={12} className="text-gray-500 mx-1 group-hover:rotate-180 transition-all duration-500" />
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                    <span className="text-lg text-green-500 font-bold">₹</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <h4 className="text-white font-bold text-xs">Redeem iPhone</h4>
                  <p className="text-green-400 text-[10px] font-bold">Value: ₹1,49,000</p>
                </div>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                <ArrowRight size={16} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Coming Soon Section */}
          <div className="space-y-3 mb-6 opacity-60 grayscale">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 pl-1">Coming Soon</h3>

            {/* E-Tokens -> INR */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                  <EToken size={16} />
                </div>
                <div>
                  <h4 className="text-gray-400 font-bold text-xs">E-Tokens <span className="text-gray-600">➔</span> INR</h4>
                  <p className="text-gray-600 text-[10px]">Redeem Cash</p>
                </div>
              </div>
              <Lock size={16} className="text-gray-600" />
            </div>
          </div>

          {/* Withdraw Button */}
          <div className="mt-auto">
            <button
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 group active:scale-95 transition-all"
            >
              <span className="text-white font-black uppercase tracking-widest">Withdraw Funds</span>
              <ArrowRight className="text-white group-hover:translate-x-1 transition-transform" size={20} />
            </button>
            <p className="text-center text-[10px] text-gray-500 mt-2">
              Minimum withdrawal: ₹100
            </p>
          </div>

        </div>
      )}



      {showExchangeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[320px] bg-gray-900 border border-white/10 rounded-2xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-200">

            <button
              onClick={() => setShowExchangeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-6 text-center">
              {exchangeMode === 'COIN_TO_TOKEN' && <>Exchange <span className="text-yellow-500">Coins</span></>}
              {exchangeMode === 'TOKEN_TO_SPIN' && <>Get <span className="text-cyan-400">Spin Tokens</span></>}
              {exchangeMode === 'KTM_TO_INR' && <>Redeem <span className="text-orange-500">KTM</span></>}
              {exchangeMode === 'IPHONE_TO_INR' && <>Redeem <span className="text-blue-500">iPhone</span></>}
              {exchangeMode === 'TOKEN_TO_INR' && <>Redeem <span className="text-green-500">Cash</span></>}
            </h3>

            <div className="flex items-center justify-center gap-6 mb-8">
              {/* Source Icon */}
              <div className="flex flex-col items-center gap-2">
                {exchangeMode === 'COIN_TO_TOKEN' && (
                  <>
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                      <span className="text-2xl">💰</span>
                    </div>
                    <span className="text-xs font-bold text-yellow-500">Coins</span>
                  </>
                )}
                {(exchangeMode === 'TOKEN_TO_SPIN' || exchangeMode === 'TOKEN_TO_INR') && (
                  <>
                    <EToken size={48} />
                    <span className="text-xs font-bold text-red-500">E-Token</span>
                  </>
                )}
                {exchangeMode === 'KTM_TO_INR' && (
                  <>
                    <KTMToken size={48} />
                    <span className="text-xs font-bold text-orange-500">KTM</span>
                  </>
                )}
                {exchangeMode === 'IPHONE_TO_INR' && (
                  <>
                    <IPhoneToken size={48} />
                    <span className="text-xs font-bold text-blue-500">iPhone</span>
                  </>
                )}
              </div>

              <ArrowRight className="text-gray-500" />

              {/* Target Icon */}
              <div className="flex flex-col items-center gap-2">
                {exchangeMode === 'COIN_TO_TOKEN' && (
                  <>
                    <EToken size={48} />
                    <span className="text-xs font-bold text-red-500">E-Token</span>
                  </>
                )}
                {exchangeMode === 'TOKEN_TO_SPIN' && (
                  <>
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
                      <SpinToken size={32} />
                    </div>
                    <span className="text-xs font-bold text-cyan-400">Spin Token</span>
                  </>
                )}
                {(exchangeMode === 'KTM_TO_INR' || exchangeMode === 'IPHONE_TO_INR' || exchangeMode === 'TOKEN_TO_INR') && (
                  <>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                      <span className="text-2xl text-green-500">₹</span>
                    </div>
                    <span className="text-xs font-bold text-green-500">Rupees</span>
                  </>
                )}
              </div>
            </div>

            {/* Slider Control */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs uppercase font-bold">Quantity</span>
                <span className="text-white font-bold text-lg">{exchangeAmount}</span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setExchangeAmount(Math.max(1, exchangeAmount - 1))}
                  className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                >
                  <Minus size={16} />
                </button>

                <div className="flex-1 relative h-2 bg-gray-800 rounded-full overflow-hidden">
                  <input
                    type="range"
                    min="1"
                    max={Math.max(1, exchangeMode === 'COIN_TO_TOKEN' ? Math.floor(coins / 1000) : exchangeMode === 'TOKEN_TO_SPIN' ? eTokens : exchangeMode === 'KTM_TO_INR' ? ktmTokens : exchangeMode === 'IPHONE_TO_INR' ? iphoneTokens : eTokens)}
                    value={exchangeAmount}
                    onChange={(e) => setExchangeAmount(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${exchangeMode === 'COIN_TO_TOKEN' ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : exchangeMode === 'TOKEN_TO_SPIN' ? 'bg-gradient-to-r from-cyan-600 to-cyan-400' : 'bg-gradient-to-r from-green-600 to-green-400'}`}
                    style={{ width: `${(exchangeAmount / Math.max(1, exchangeMode === 'COIN_TO_TOKEN' ? Math.floor(coins / 1000) : exchangeMode === 'TOKEN_TO_SPIN' ? eTokens : exchangeMode === 'KTM_TO_INR' ? ktmTokens : exchangeMode === 'IPHONE_TO_INR' ? iphoneTokens : eTokens)) * 100}%` }}
                  ></div>
                </div>

                <button
                  onClick={() => setExchangeAmount(Math.min(exchangeMode === 'COIN_TO_TOKEN' ? Math.floor(coins / 1000) : exchangeMode === 'TOKEN_TO_SPIN' ? eTokens : exchangeMode === 'KTM_TO_INR' ? ktmTokens : exchangeMode === 'IPHONE_TO_INR' ? iphoneTokens : eTokens, exchangeAmount + 1))}
                  className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-500">1</span>
                <span className="text-[10px] text-gray-500">{exchangeMode === 'COIN_TO_TOKEN' ? Math.floor(coins / 1000) : exchangeMode === 'TOKEN_TO_SPIN' ? eTokens : exchangeMode === 'KTM_TO_INR' ? ktmTokens : exchangeMode === 'IPHONE_TO_INR' ? iphoneTokens : eTokens}</span>
              </div>
            </div>

            {/* Cost/Value Display */}
            <div className="flex items-center justify-between bg-black/40 rounded-lg p-3 mb-6 border border-white/5">
              <span className="text-gray-400 text-sm font-bold">
                {exchangeMode === 'COIN_TO_TOKEN' ? 'Total Cost' : 'Total Value'}
              </span>
              <span className={`${exchangeMode === 'COIN_TO_TOKEN' ? 'text-yellow-400' : exchangeMode === 'TOKEN_TO_SPIN' ? 'text-cyan-400' : 'text-green-400'} font-bold text-lg`}>
                {exchangeMode === 'COIN_TO_TOKEN' && `${(exchangeAmount * 1000).toLocaleString()} Coins`}
                {exchangeMode === 'TOKEN_TO_SPIN' && `${exchangeAmount.toLocaleString()} Spin Tokens`}
                {exchangeMode === 'KTM_TO_INR' && `₹${(exchangeAmount * 340000).toLocaleString()}`}
                {exchangeMode === 'IPHONE_TO_INR' && `₹${(exchangeAmount * 149000).toLocaleString()}`}
                {exchangeMode === 'TOKEN_TO_INR' && `₹${exchangeAmount.toLocaleString()}`}
              </span>
            </div>

            {exchangeError && (
              <p className="text-red-500 text-xs font-bold text-center mb-4 animate-pulse">
                {exchangeError}
              </p>
            )}

            <button
              onClick={handleConfirmExchange}
              disabled={exchangeAmount < 1 || (exchangeMode === 'COIN_TO_TOKEN' ? coins < 1000 : exchangeMode === 'TOKEN_TO_SPIN' ? eTokens < 1 : exchangeMode === 'KTM_TO_INR' ? ktmTokens < 1 : exchangeMode === 'IPHONE_TO_INR' ? iphoneTokens < 1 : eTokens < 1)}
              className="w-full py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm {exchangeMode === 'COIN_TO_TOKEN' || exchangeMode === 'TOKEN_TO_SPIN' ? 'Exchange' : 'Redeem'}
            </button>

          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[400px] bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">

            {/* Close Button */}
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-6">
              Edit <span className="text-yellow-500">Profile</span>
            </h3>

            {/* Photo Section */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-32 h-32 mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full blur-lg opacity-30"></div>
                <div className="relative w-full h-full rounded-full border-4 border-yellow-400 overflow-hidden bg-gray-800 shadow-lg">
                  <img src={photoPreview} alt="Profile Preview" className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Change Photo Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors shadow-lg"
              >
                <Camera size={18} />
                Change Photo
              </button>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />

              <p className="text-gray-500 text-xs mt-2">Click to upload a new profile picture</p>

              {/* File Size Display */}
              {selectedFile && (
                <p className="text-cyan-400 text-xs mt-1 font-bold">
                  📎 {(selectedFile.size / 1024).toFixed(0)} KB / 2048 KB
                </p>
              )}
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-xs font-bold text-center">
                  ⚠️ {uploadError}
                </p>
              </div>
            )}

            {/* Info Section - Placeholder */}
            <div className="bg-black/40 rounded-lg p-4 mb-6 border border-white/5">
              <p className="text-gray-400 text-xs text-center">
                📝 Name and username editing coming soon...
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setUploadError('');
                  setSelectedFile(null);
                }}
                disabled={uploading}
                className={`flex-1 py-3 font-bold uppercase tracking-wider rounded-xl transition-colors border border-white/10 ${uploading
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={uploading || !selectedFile}
                className={`flex-1 py-3 font-black uppercase tracking-wider rounded-xl transition-colors shadow-lg ${uploading || !selectedFile
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400 shadow-yellow-500/20'
                  }`}
              >
                {uploading ? 'Uploading...' : 'Save Changes'}
              </button>
            </div>

            {/* Loading Overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl z-10">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent mx-auto mb-2"></div>
                  <p className="text-sm font-bold">Uploading Photo...</p>
                  <p className="text-xs text-gray-400 mt-1">Please wait</p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Crop Photo Modal */}
      {showCropModal && imageSrc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 rounded-2xl border-2 border-yellow-500/30 shadow-2xl shadow-yellow-500/10 w-full max-w-lg relative animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                Crop Photo
              </h3>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setShowEditModal(true);
                  setImageSrc(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Crop Area */}
            <div className="relative h-96 bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Controls */}
            <div className="p-6 space-y-4">
              {/* Zoom Slider */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Zoom</span>
                  <span className="text-yellow-500">{Math.round(zoom * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
              </div>

              {/* Instructions */}
              <p className="text-xs text-gray-500 text-center">
                Drag to reposition • Pinch or scroll to zoom
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setShowEditModal(true);
                    setImageSrc(null);
                  }}
                  className="flex-1 py-3 bg-gray-800 text-white font-bold uppercase tracking-wider rounded-xl hover:bg-gray-700 transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropConfirm}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black uppercase tracking-wider rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-colors shadow-lg shadow-yellow-500/20"
                >
                  Crop Photo
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
