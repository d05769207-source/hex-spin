# 🐛 Authentication System - Known Bugs & Issues

**Date:** 24 Dec 2024  
**Status:** 🔴 Critical - Needs Fix

---

## 📋 Summary

Humare authentication system me **2 major bugs** hain jo user experience ko kharab kar rahe hain:

1. **Cache Clear Bug** - Same account se re-login karne par username dobara maangta hai
2. **Account Switch Bug** - Logout ke baad different account se login nahi ho pata

---

## 🔴 Bug #1: Cache Clear Username Reset

### Problem Kya Hai?

Jab user **cache clear** karta hai (`Ctrl + Shift + Delete`) aur fir **same Gmail account** se login karta hai, to system usse **username dobara set karne** ko bolta hai.

### Expected Behavior (Hona Chahiye)

- User ka data **Firestore me already save** hai
- Login karne par **seedha game me enter** hona chahiye
- Username modal **nahi aana chahiye**

### Actual Behavior (Ho Kya Raha Hai)

1. User cache clear karta hai
2. Same account se login karta hai
3. System **username modal** dikha deta hai
4. User ko **dobara username enter** karna padta hai
5. Agar wo same username daale to **error** aa sakta hai (duplicate)

### Root Cause (Possible)

```typescript
// App.tsx - Line ~234
if (!userData.displayId || !userData.referralCode) {
    // Ye check galat hai - agar user already exist karta hai
    // to bhi ye username modal dikha deta hai
}
```

**Issue:** Firestore se data load hone se pehle hi check ho raha hai, ya `displayName` Firebase Auth me nahi hai.

---

## 🔴 Bug #2: Account Switch Failure

### Problem Kya Hai?

Jab user **logout** karta hai aur fir **different Gmail account** se login/signup karne ki koshish karta hai, to **kuch nahi hota**.

### Expected Behavior (Hona Chahiye)

1. User logout kare
2. Google Login button dabaye
3. **Account selection screen** aaye
4. Different account choose kare
5. Successfully login/signup ho

### Actual Behavior (Ho Kya Raha Hai)

1. User logout karta hai ✅
2. Google Login button dabata hai ✅
3. Account selection screen **nahi aata** ❌
4. **Purana account automatically select** ho jata hai ❌
5. Ya fir **koi response nahi** milta ❌

### Root Cause

**Google Auth Provider** me `prompt: 'select_account'` missing tha.

### ✅ Fix Applied (Partial)

```typescript
// App.tsx - handleGoogleLogin
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account' // ✅ Added
});
```

**Status:** Fix lagaya hai, lekin **testing pending** hai.

---

## 🧪 Testing Steps (Verify Karne Ke Liye)

### Test Case 1: Cache Clear + Same Account

1. Login karo (Account A)
2. Cache clear karo (`Ctrl + Shift + Delete`)
3. Fir se **same account** se login karo
4. **Expected:** Seedha game me enter ho, username modal **nahi** aana chahiye

### Test Case 2: Account Switch

1. Login karo (Account A)
2. Logout karo
3. Google Login dabao
4. **Expected:** Account selection screen aaye
5. Different account (Account B) choose karo
6. **Expected:** Successfully login/signup ho

### Test Case 3: New User Signup

1. Completely new Gmail account use karo
2. Google Login dabao
3. **Expected:** Username modal aaye (ye correct hai)
4. Username enter karo
5. **Expected:** Successfully signup ho

---

## 🛠️ Proposed Solutions

### Solution for Bug #1 (Cache Clear Issue)

**Option A: Fix Auth State Check**
```typescript
// App.tsx - onAuthStateChanged listener
if (firebaseUser.displayName && userDoc.exists()) {
  // User already registered - load data
  // NO username modal
} else if (firebaseUser.displayName && !userDoc.exists()) {
  // Auth has name but Firestore missing - create profile
  await createUserProfile(...)
} else {
  // Completely new user - show username modal
  setShowUsernameModal(true);
}
```

**Option B: Check Firestore First**
```typescript
const userDoc = await getDoc(userDocRef);
if (userDoc.exists()) {
  // User data hai - load karo
  loadUserData(userDoc.data());
  setShowUsernameModal(false); // Force close modal
} else {
  // Naya user - modal dikhao
  setShowUsernameModal(true);
}
```

### Solution for Bug #2 (Account Switch)

✅ **Already Applied** - `prompt: 'select_account'` added

**Additional Fix Needed:**
```typescript
// Logout me bhi clear karo Google session
const handleLogout = async () => {
  try {
    setIsSyncEnabled(false);
    await signOut(auth);
    
    // Clear any cached Google session
    sessionStorage.clear();
    localStorage.removeItem('googleUser'); // If exists
    
    setCurrentPage('HOME');
  } catch (error) {
    console.error(error);
  }
};
```

---

## 🎯 Priority

| Bug | Priority | Impact | Status |
|-----|----------|--------|--------|
| Bug #1 (Cache Clear) | 🔴 High | User frustration, duplicate username errors | ⏳ Pending Fix |
| Bug #2 (Account Switch) | 🔴 High | Cannot switch accounts | ✅ Partial Fix Applied |

---

## 📝 Notes

- **Bug #1** zyada critical hai kyunki existing users ko affect kar raha hai
- **Bug #2** ka fix test karna hai - agar kaam nahi kare to `sessionStorage.clear()` try karein
- Dono bugs **Firebase Auth** aur **Firestore sync** ke beech coordination issue ki wajah se hain

---

**Next Steps:**
1. Bug #1 fix karo (Firestore check improve karo)
2. Bug #2 test karo (account switch verify karo)
3. Dono test cases run karo
4. Production me deploy karne se pehle thoroughly test karo
