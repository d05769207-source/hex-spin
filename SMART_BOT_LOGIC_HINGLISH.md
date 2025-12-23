# 🤖 Smart Bot System Logic (Hinglish Guide)

Ye file poora system samjhati hai ki Smart Bots kaise kaam karte hain, wo kis din kahan hone chahiye, aur wo "over-playing" se kaise bachte hain.

---

## 📅 Day-Wise Strategy (Hafte ka Plan)

Bot ka main maqsad hai real users ko engage karna, bina shuru me hi unhe haraye. Isliye wo dheere-dheere apna rank badhate hain.

| Din (Day) | Target Rank | Behavior (Vyavahar) |
| :--- | :--- | :--- |
| **Mon - Tue** | **#40 - #50** | **Low Activity:** Bots shuru me slow rahenge. Wo bas itna hi khelenge ki Top 50 me dikhte rahein, par Top 20 me nahi aayenge taaki naye users ko chance mile. |
| **Wed - Thu** | **#20 - #30** | **Medium Activity:** Ab bots thoda active honge. Wo mid-table par aana shuru karenge taaki competition feel ho. |
| **Fri - Sat** | **#5 - #10** | **High Activity:** Weekend aa raha hai, ab bots Top 10 ke liye fight karenge. |
| **Sunday** | **#1 - #3** | **Aggressive (Rush Hour):** Sunday subah se bots Top 3 me aane ki koshish karenge. Shaam ko (Rush Hour) wo kisi ko jeetne nahi denge. |

---

## ⚡ Rush Hour Logic (Sunday Special)

Sunday ko "Rush Hour" (shaam ke waqt) activate hota hai.

*   **Kya hota hai?** Bot check karega ki **Real User** ka highest score kya hai.
*   **Target:** Bot ka target hoga: `Real User Top Score + 10,000 coins`.
*   **Result:** Agar koi user 50,000 banata hai, bot turant 60,000 par pahunch jayega. Koi kitna bhi khele, bot usse aage hi rahega.

---

## 🧠 Smart Maintenance Logic (Problem Fixed)

**Pehle Problem thi:**
Bots Tuesday ko bhi #17 par pahunch ja rahe the kyunki wo bore hone par bhi "timepass" spin kar rahe the.

**Ab Solution (Strict Chill Mode):**
Har 6 seconds me Bot check karta hai:
1.  **Mera Target kya hai?** (e.g., Tuesday hai toh Rank #45 ka score chahiye).
2.  **Kya main aage hu?**
    *   **Haan:** Agar Bot ka score Target se zyada hai, toh wo **Bilkul Ruk Jayega** (99% chance hai ki wo spin nahi karega).
    *   **Na:** Agar wo peeche hai, toh wo catch-up karega.

**Fayda:** Isse bots fix position par chipke rahenge. Agar Tuesday ko target rank #45 hai, toh wo wahi rukenge, upar nahi jayenge.

---

## 💰 Randomizer (Shaq se bachne ke liye)

Bots insaan lagein, isliye humne rewards ko randomize kiya hai:
*   **Catch Up:** Jab bot peeche hota hai, wo fixed 1000/2000 nahi leta. Wo `1250` se `3500` ke beech koi bhi random value leta hai.
*   **Normal Spin:** Wo kabhi 50, kabhi 100, kabhi 500 jeet ta hai, bilkul real user ki tarah.

---

## 🧪 Testing Zone (Admin Panel)

Admin Panel me ab aap poora system test kar sakte hain:
1.  **Fill Leaderboard:** 80 nakli players daal kar bheed bhadakka kar sakte hain.
2.  **Auto-Run:** System ko continuous chala sakte hain.
3.  **Force Days:** Aap Monday/Sunday force karke dekh sakte hain ki bots waisa hi behave kar rahe hain ya nahi.

---
**Summary:**
System ab puri tarah dynamic hai. Wo din ke hisab se apne aap ko adjust karega aur agar wo jeet raha hai toh shant baith jayega taaki shaq na ho.
