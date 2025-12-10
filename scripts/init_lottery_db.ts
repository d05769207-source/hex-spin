import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// Inline Firebase Config to avoid import issues
const firebaseConfig = {
    apiKey: "AIzaSyCqk2HKkodUeTtEh_xRxrcHljrpfxWcIt4",
    authDomain: "lucky-chakra.firebaseapp.com",
    databaseURL: "https://lucky-chakra-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "lucky-chakra",
    storageBucket: "lucky-chakra.firebasestorage.app",
    messagingSenderId: "168560073638",
    appId: "1:168560073638:web:c06fcf6a418de96b570d67",
    measurementId: "G-Y8F7KJR1TB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const setupSundayLottery = async () => {
    try {
        console.log('Initializing Sunday Lottery database...');

        // Get next Sunday's date for reference
        const now = new Date();
        const nextSunday = new Date();
        nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));

        // Set basic time (just for initialization, real updates will happen via Admin panel or scheduled jobs)
        const iphoneStart = new Date(nextSunday);
        iphoneStart.setHours(19, 0, 0, 0); // 7:00 PM

        const iphoneEnd = new Date(nextSunday);
        iphoneEnd.setHours(19, 10, 0, 0); // 7:10 PM

        const ktmStart = new Date(nextSunday);
        ktmStart.setHours(20, 0, 0, 0); // 8:00 PM

        const ktmEnd = new Date(nextSunday);
        ktmEnd.setHours(20, 10, 0, 0); // 8:10 PM

        const eventData = {
            iphone_start: Timestamp.fromDate(iphoneStart),
            iphone_end: Timestamp.fromDate(iphoneEnd),
            ktm_start: Timestamp.fromDate(ktmStart),
            ktm_end: Timestamp.fromDate(ktmEnd),
            iphone_winner: null,
            ktm_winner: null,
            status: 'WAITING', // WAITING, LIVE_IPHONE, LIVE_KTM, ENDED
            last_updated: Timestamp.now()
        };

        await setDoc(doc(db, 'events', 'sunday_lottery'), eventData, { merge: true });

        console.log('✅ Sunday Lottery database initialized successfully!');
        console.log('Document path: events/sunday_lottery');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
};

// Execute if run directly
setupSundayLottery();
