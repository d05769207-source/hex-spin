# 🤖 Smart Bot Master Plan (Final Strategy)

Ye file batati hai ki humare Bots kaise behave karenge, unke IDs kaise manage honge, aur system kaise real lagega.

## 1. Abhi Ki Situation (Current Status)
*   **IDs:** Bots ke IDs `900000` series me hain, jo fake lagte hain (kyunki Real User `100084` pe hai).
*   **Delete Logic:** Har hafte bots delete ho jate hain, aur unka profile bhi gayab ho jata hai.
*   **Problem:** User search karta hai to "User Not Found" aata hai. Real users ko lagta hai game fake hai.

---

## 2. Naya Plan (New Logic We Are Adding)

Hum 3 bade features add kar rahe hain:

### A. Smart ID Pool (Chupa hua Reservation)
Hum Bots ke liye IDs reserve karenge, par smart tarike se.

*   **Kaise:** Jab naya Real User aayega, System check karega:
    *   *"Kya mere paas future ke liye 3-5 IDs reserved hain?"*
    *   **NO:** To abhi wala ID (e.g. `100021`) User ko mat do. Usko **Reserve** kar lo. User ko agla ID (`100022`) do.
    *   **YES:** To User ko normal ID de do. Koi waste nahi.
*   **Fayda:**
    *   Bots ko `100021` milega (Jo sequence me hai).
    *   Agar users badh gaye (1 Lakh bhi aa gaye), to system sirf utne hi ID reserve karega jitne bots ko chahiye. **Zero Waste.**

### B. Persistent Bots (Hall of Fame)
Ab Bots kabhi delete nahi honge. Wo bas **"Retire"** honge.

*   **Current Week:** Bots leaderboard par fight karenge.
*   **Next Week:** Ye Bots Leaderboard se hat jayenge, lekin database me `users` collection me rahenge.
*   **Fayda:** Agar User puraane winner ko search karega, to uska **Profile Dikhega**. Usko lagega "Haan ye real banda hai".

### C. Zombie Mode (Thoda Active Rehna)
Jo Bots retire ho gaye hain, wo bilkul mar nahi jayenge.

*   **Logic:** Humara system purane bots ko mahine me 1-2 baar random **Spin** karwayega.
*   **Impact:** Unka "Last Active" time update hoke "Today" ya "Yesterday" dikhega.
*   **Result:** User sochega "Ye purana player abhi bhi kabhi-kabhi game khelta hai".

---

## 3. Final Result (Ye Sab Karne Ke Baad)

System aisa dikhega:

1.  **Leaderboard par:**
    *   **Bot 1 (The King):** Level 40, ID `100021`. (Real ID sequence).
    *   **Bot 2 (Challenger):** Level 28, ID `100055`.
    *   **Rank Fight:** Dono ke beech gap rahega (e.g. Rank 4 vs Rank 12).
2.  **Search Bar me:**
    *   Aap pichle mahine ke winner ko search kar paoge. Uski profile khulegi.
3.  **Realism:**
    *   Users ko shak nahi hoga kyunki IDs `1xxxxx` series me hain.
    *   System automatic chalega (Auto-Reserve IDs).

---

## 4. Next Steps (Implementation)
1.  **Phase 1:** `userService.ts` me "Smart Pool" logic lagana.
2.  **Phase 2:** `smartBotService.ts` me "Retirement" logic lagana (Delete logic hatana).
3.  **Phase 3:** "Zombie Mode" ka chhota script banana.

---

## 5. Firebase Rules & Permissions (Jaroori Cheezein)

Ye naya system lagane ke liye hume database rules change karne padenge taaki security bani rahe.

### Required Rules
*   **`system/reserved_bot_ids`**: 
    *   Hume ek naya collection `system` ya `meta` banana padega jahan reserved IDs save honge.
    *   **Rule:** Sirf `backend` (Admin/Server) isko read/write kar sake. Normal User isko access na kar paye.

```javascript
match /system/reserved_bot_ids {
  allow read, write: if false; // Sirf Server Admin SDK se access hoga (Code ke through)
}
```

*   **`users/{userId}`**:
    *   Ab Bots `users` collection me rahenge.
    *   **Rule:** Public Read allowed hona chahiye (taaki Search kaam kare), lekin Write sirf Owner kar sake. Ye rule already hota hai mostly.

### Kya Naya Permission Chahiye?
*   Nahi, `services/smartBotService.ts` already **Admin Privileges** (agar backend hai) ya Client Side Admin Logic se chalta hai.
*   Agar hum client side se chala rahe hain (jaisa abhi hai), to hume ensure karna hoga ki `reserved_bot_ids` collection secured rahe.
