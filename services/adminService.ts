import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getCountFromServer,
    Timestamp,
    doc,
    getDoc,
    QueryDocumentSnapshot,
    DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

export interface AdminStats {
    onlineUsers: number;
    totalRegistrations: number;
    spinsToday: number;
    rewardsDistributed: number;
}

export interface UserListResult {
    users: User[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

// Get global stats for the dashboard
export const getDashboardStats = async (): Promise<AdminStats> => {
    try {
        // 1. Total Registrations
        const usersRef = collection(db, 'users');
        const totalSnapshot = await getCountFromServer(usersRef);
        const totalRegistrations = totalSnapshot.data().count;

        // 2. Online Users (Active in last 5 minutes)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const onlineQuery = query(
            usersRef,
            where('lastActive', '>', Timestamp.fromDate(fiveMinsAgo))
        );
        const onlineSnapshot = await getCountFromServer(onlineQuery);
        const onlineUsers = onlineSnapshot.data().count;

        // 3. Spins Today (Using an estimate or global counter if available)
        // For now, we'll try to get it from a global counter 'gameStats/daily' if it existed, 
        // but since we don't have it, we'll return 0 or a placeholder. 
        // NOTE: Summing all users 'spinsToday' is too expensive for a dashboard load.
        // We will implement a global counter in a future task if needed.
        const spinsToday = 0;

        // 4. Rewards Distributed
        // Similarly, this would require a global counter or transaction log.
        const rewardsDistributed = 0;

        return {
            onlineUsers,
            totalRegistrations,
            spinsToday,
            rewardsDistributed
        };
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return {
            onlineUsers: 0,
            totalRegistrations: 0,
            spinsToday: 0,
            rewardsDistributed: 0
        };
    }
};

// Get paginated users list
export const getUsersList = async (
    limitCount: number = 20,
    lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
    searchQuery: string = ''
): Promise<UserListResult> => {
    try {
        const usersRef = collection(db, 'users');
        let q;

        if (searchQuery) {
            // Simple search by username (case-insensitive if we had a lowerCase field, 
            // but for now we'll match exact or startWith if possible given Firestore constraints)
            // Firestore doesn't support 'contains' natively without 3rd party like Algolia.
            // We'll try to search by 'username' exact match for now or just prefix.
            // Assuming 'username' query.

            // NOTE: Firestore requires separate index for this likely. 
            // We'll try a simple prefix match on 'username'.
            q = query(
                usersRef,
                where('username', '>=', searchQuery),
                where('username', '<=', searchQuery + '\uf8ff'),
                limit(limitCount)
            );
        } else {
            if (lastDoc) {
                q = query(
                    usersRef,
                    orderBy('createdAt', 'desc'),
                    startAfter(lastDoc),
                    limit(limitCount)
                );
            } else {
                q = query(
                    usersRef,
                    orderBy('createdAt', 'desc'),
                    limit(limitCount)
                );
            }
        }

        const snapshot = await getDocs(q);
        const users: User[] = snapshot.docs.map(doc => {
            const data = doc.data() as any; // Cast to any to allow access to known properties
            return {
                id: doc.id,
                uid: data.uid,
                email: data.email,
                username: data.username,
                isGuest: data.isGuest,
                eTokens: data.eTokens,
                coins: data.coins, // Total Coins
                weeklyCoins: data.weeklyCoins,
                photoURL: data.photoURL,
                displayId: data.displayId,
                referralCode: data.referralCode,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
                lastActive: data.lastActive?.toDate ? data.lastActive.toDate() : undefined,
                spinsToday: data.spinsToday,
                ip: data.ip || 'N/A', // Assuming we might store IP later
                status: (data.lastActive?.toDate && data.lastActive.toDate().getTime() > Date.now() - 5 * 60 * 1000) ? 'online' : 'offline'
            } as any;
        });

        // Map status manually since it's not in DB
        const mappedUsers = users.map(u => ({
            ...u,
            status: (u.lastActive && u.lastActive.getTime() > Date.now() - 5 * 60 * 1000) ? 'online' : 'offline'
        }));

        return {
            users: mappedUsers as any[], // Force cast to avoid strict type mismatch on 'status' field which is UI only
            lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
        };
    } catch (error) {
        console.error("Error fetching users list:", error);
        return { users: [], lastDoc: null };
    }
};
