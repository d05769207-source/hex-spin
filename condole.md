leaderboardService.ts:137 
 POST https://firestore.googleapis.com/v1/projects/lucky-chakra/databases/(default)/documents:runAggregationQuery 400 (Bad Request)
Promise.then		
getUserRank	@	leaderboardService.ts:137
await in getUserRank		
(anonymous)	@	useLeaderboard.ts:38
(anonymous)	@	leaderboardService.ts:107
Promise.then		
attemptAutoBotUpdate	@	botService.ts:514
(anonymous)	@	App.tsx:183
<App>		
(anonymous)	@	index.tsx:13

leaderboardService.ts:137 [2025-12-09T06:26:56.512Z]  @firebase/firestore: Firestore (12.6.0): RestConnection RPC 'RunAggregationQuery' 0x44d79818 failed with error:  {"code":"failed-precondition","name":"FirebaseError"} url:  https://firestore.googleapis.com/v1/projects/lucky-chakra/databases/(default)/documents:runAggregationQuery request: {"structuredAggregationQuery":{"aggregations":[{"alias":"aggregate_0","count":{}}],"structuredQuery":{"from":[{"collectionId":"weeklyLeaderboard"}],"where":{"compositeFilter":{"op":"AND","filters":[{"fieldFilter":{"field":{"fieldPath":"weekId"},"op":"EQUAL","value":{"stringValue":"2025-W50"}}},{"fieldFilter":{"field":{"fieldPath":"coins"},"op":"GREATER_THAN","value":{"integerValue":"78925"}}}]}}}}}
Promise.then		
getUserRank	@	leaderboardService.ts:137
await in getUserRank		
(anonymous)	@	useLeaderboard.ts:38
(anonymous)	@	leaderboardService.ts:107
Promise.then		
attemptAutoBotUpdate	@	botService.ts:514
(anonymous)	@	App.tsx:183
leaderboardService.ts:144 Error getting user rank: FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/lucky-chakra/firestore/ind…cmJvYXJkL2luZGV4ZXMvXxABGgoKBndlZWtJZBABGgkKBWNvaW5zEAEaDAoIX19uYW1lX18QAQ
getUserRank	@	leaderboardService.ts:144
await in getUserRank		
(anonymous)	@	useLeaderboard.ts:38
(anonymous)	@	leaderboardService.ts:107
Promise.then		
attemptAutoBotUpdate	@	botService.ts:514
(anonymous)	@	App.tsx:183
<App>		
(anonymous)	@	index.tsx:13
﻿

Press ctrl i to turn on code suggestions. Press ctrl x to disable code suggestions.
ctrl
i
 to turn on code suggestions. Don't show again

