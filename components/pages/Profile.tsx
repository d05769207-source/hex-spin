
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Settings, Edit, ExternalLink, Share2, LogOut, ArrowRight, Minus, Plus, X, Camera } from 'lucide-react';
import { User } from '../../types';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Cropper from 'react-easy-crop';
import EToken from '../EToken';

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
}

const Profile: React.FC<ProfileProps> = ({ onBack, coins, tokens, eTokens, user, onLogout, onExchange }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [exchangeAmount, setExchangeAmount] = useState(1);
  const [exchangeError, setExchangeError] = useState('');
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'REDEEM'>('PROFILE');
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

    const success = onExchange(exchangeAmount);
    if (success) {
      setShowExchangeModal(false);
      // Optional: Show success toast
    } else {
      setExchangeError('Insufficient Coins');
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
          {/* User Card */}
          <div className="flex flex-col items-center mb-8" onClick={() => setShowSettings(false)}>
            <div className="relative w-24 h-24 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full animate-pulse-fast blur-md opacity-50"></div>
              <div className="relative w-full h-full rounded-full border-2 border-yellow-400 overflow-hidden bg-gray-800">
                <img src={photoPreview} alt="User" className="w-full h-full object-cover" />
              </div>
              {user && !user.isGuest && (
                <div className="absolute bottom-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-black">
                  PRO
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-white">{user?.username || 'Guest Player'}</h3>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">
              {user?.email || 'Login to save progress'}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6" onClick={() => setShowSettings(false)}>
            <div className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-4 flex flex-col items-center">
              <span className="text-yellow-400 font-bold text-2xl drop-shadow-sm">{coins.toLocaleString()}</span>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Coins</span>
            </div>
            <div className="bg-gray-900/60 border border-cyan-500/20 rounded-xl p-4 flex flex-col items-center">
              <span className="text-cyan-400 font-bold text-2xl drop-shadow-sm">{tokens}</span>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Spin Tokens</span>
            </div>
            <div className="bg-gray-900/60 border border-white/10 rounded-xl p-4 flex flex-col items-center">
              <span className="text-white font-bold text-2xl">234</span>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Spins</span>
            </div>
            <div className="bg-gray-900/60 border border-white/10 rounded-xl p-4 flex flex-col items-center">
              <span className="text-white font-bold text-2xl">#1,245</span>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider">Current Rank</span>
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

      {activeTab === 'REDEEM' && (
        <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="bg-gradient-to-r from-cyan-900 to-blue-900 border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between md:justify-center md:gap-12 relative overflow-hidden shadow-lg shadow-cyan-900/20">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>

            <div className="flex items-center gap-2 md:gap-8 z-10 w-full justify-between px-2">
              {/* Coin */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                  <span className="text-base md:text-2xl">💰</span>
                </div>
                <span className="text-[8px] md:text-xs text-yellow-400 font-bold mt-1">Coins</span>
              </div>

              {/* Arrow & Rate */}
              <div className="flex flex-col items-center justify-center flex-1 px-2">
                <div className="w-full flex justify-center transform scale-x-150">
                  <ArrowRight className="text-cyan-400 animate-pulse" size={20} />
                </div>
                <span className="text-[8px] font-bold text-cyan-200/70 mt-1 whitespace-nowrap">1000 = 1</span>
              </div>

              {/* E-Token */}
              <div className="flex flex-col items-center">
                <div className="scale-75 md:scale-110 origin-center">
                  <EToken size={40} />
                </div>
                <span className="text-[8px] md:text-xs text-cyan-300 font-bold mt-1">E-Token</span>
              </div>
            </div>

            {/* Exchange Button */}
            <button
              onClick={() => setShowExchangeModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black py-1.5 px-3 md:py-2 md:px-8 rounded-lg shadow-lg shadow-cyan-500/20 transition-all active:scale-95 z-10 text-[10px] md:text-sm uppercase tracking-wider ml-2 whitespace-nowrap"
            >
              Exchange
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {activeTab === 'PROFILE' && (
        <div className="grid gap-2 mb-20 md:mb-0" onClick={() => setShowSettings(false)}>
          <button className="flex items-center justify-between p-4 bg-gray-800 rounded-lg text-white font-bold hover:bg-gray-700 transition-colors border border-white/5">
            <div className="flex items-center gap-3">
              <Share2 size={18} className="text-cyan-400" />
              <span>Refer & Earn</span>
            </div>
            <ExternalLink size={16} className="text-gray-500" />
          </button>
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
              Exchange <span className="text-red-500">Tokens</span>
            </h3>

            <div className="flex items-center justify-center gap-6 mb-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                  <span className="text-2xl">💰</span>
                </div>
                <span className="text-xs font-bold text-yellow-500">Coins</span>
              </div>

              <ArrowRight className="text-gray-500" />

              <div className="flex flex-col items-center gap-2">
                <EToken size={48} />
                <span className="text-xs font-bold text-red-500">E-Token</span>
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
                    max={Math.max(1, MAX_EXCHANGE)}
                    value={exchangeAmount}
                    onChange={(e) => setExchangeAmount(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-100"
                    style={{ width: `${(exchangeAmount / Math.max(1, MAX_EXCHANGE)) * 100}%` }}
                  ></div>
                </div>

                <button
                  onClick={() => setExchangeAmount(Math.min(MAX_EXCHANGE, exchangeAmount + 1))}
                  className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-500">1</span>
                <span className="text-[10px] text-gray-500">{MAX_EXCHANGE}</span>
              </div>
            </div>

            {/* Cost Display */}
            <div className="flex items-center justify-between bg-black/40 rounded-lg p-3 mb-6 border border-white/5">
              <span className="text-gray-400 text-sm font-bold">Total Cost</span>
              <span className="text-red-400 font-bold text-lg">
                -{(exchangeAmount * 1000).toLocaleString()} Coins
              </span>
            </div>

            {exchangeError && (
              <p className="text-red-500 text-xs font-bold text-center mb-4 animate-pulse">
                {exchangeError}
              </p>
            )}

            <button
              onClick={handleConfirmExchange}
              disabled={exchangeAmount > MAX_EXCHANGE || coins < 1000}
              className="w-full py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Exchange
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
