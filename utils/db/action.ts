"use server";

import { db } from "./dbConfig";
import { Users, Notifications, Transactions, Reports, Rewards,collectedWastes, Buyers,Sellers } from "./schema";
import { eq, sql, and, desc, ilike } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";


const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string



export async function createUser(email: string, name: string) {
  try {
    const [user] = await db
      .insert(Users)
      .values({ email, name })
      .returning()
      .execute();
    return user;
  } catch (error) {
    console.error("Error creating user", error);
    return null;
  }
}


export async function getUserByEmail(email: string) {
  try {
    const [user] = await db.select().from(Users).where(eq(Users.email, email));
    return user;
  } catch (error) {
    console.error("Error fetching user email", error);
    return null;
  }
}

export async function getUnreadNotifications(userId: number) {
  try {
    return await db
      .select()
      .from(Notifications)
      .where(
        and(eq(Notifications.userId, userId), eq(Notifications.isRead, false))
      )
      .execute();
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return [];
  }
}

//get the total point for a user
// export async function getTotalTransactionAmount(userId: number) {
//   const result = await db
//     .select({ total: sql`SUM(${Transactions.amount})` })
//     .from(Transactions)
//     .where(eq(Transactions.userId, userId));

//   return result[0]?.total ?? 0;
// }


export async function getTotalTransactionAmount(userId: number): Promise<{ total: number }> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(points), 0)` }) // or whatever column you're summing
    .from(Rewards)
    .where(eq(Rewards.userId, userId));

  return result[0]; // return object with total key
}


export async function getUserBalance(userId: number): Promise<number> {
  const transactions = (await getRewardTransactions(userId)) || [];

  if (!transactions) return 0;
  const balance = transactions.reduce((acc: number, transaction: any) => {
    return transaction.type.startsWith("earned")
      ? acc + transaction.amount
      : acc - transaction.amount;
  }, 0);
  return Math.max(balance, 0);
}

export async function getRewardTransactions(userId: number) {
  try {
    const transactions = db
      .select({
        id: Transactions.id,
        type: Transactions.type,
        amount: Transactions.amount,
        description: Transactions.description,
        date: Transactions.date,
      })
      .from(Transactions)
      .where(eq(Transactions.userId, userId))
      .orderBy(desc(Transactions.date))
      .limit(10)
      .execute();

    // Return empty array if no transactions found
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }

    const formattedTransactions = transactions.map((t) => ({
      ...t,
      date: t.date
        ? t.date.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    }));

    return formattedTransactions;
  } catch (error) {
    console.error("Error fetching reward transaction", error);
    return null;
  }
}

export async function markNotificationAsRead(notificationId: number) {
  try {
    await db
      .update(Notifications)
      .set({ isRead: true })
      .where(eq(Notifications.id, notificationId));
  } catch (error) {
    console.error("Error marking notification as read", error);
  }
}

// export async function createReport(
//   userId: number,
//   location: string,
//   wasteType: string,
//   amount: string,
//   imageUrl?: string,
//   verificationResult?: any,

// ){
//   try {
//     if (!userId || !location || !wasteType || !amount) {
//       throw new Error('Missing required fields for report creation');
//     }

//     const reportData = {
//       userId: userId,
//       location,
//       wasteType: wasteType,
//       amount,
//       status: "pending"
//     };

//     // Only add optional fields if they exist
//     if (imageUrl) {
//       reportData.imageUrl = imageUrl;
//     }
//     if (verificationResult) {
//       reportData.verificationResult = verificationResult;
//     }

//     console.log("ReportData:", reportData);

//     console.log('Attempting to create report with data:', reportData);

//     const [report] = await db.insert(Reports)
//       .values(reportData)
//       .returning({
//         id: Reports.id,
//         location: Reports.location,
//         wasteType: Reports.wasteType,
//         amount: Reports.amount,
//         createdAt: Reports.createdAt,
//       })
//       .execute();

//     console.log('Database insert result:', report);

//     if (!report || !report.id) {
//       console.error('Database insert did not return a valid report');
//       throw new Error('Failed to create report record');
//     }

//     const pointEarned = 10;

//     try {
//       // Handle reward-related operations
//       await Promise.all([
//         updateRewardPoints(userId, pointEarned),
//         createTransaction(userId, 'earned_report', pointEarned, 'points earned for reporting waste'),
//         createNotification(userId, `You've earned ${pointEarned} points for reporting waste!`, "reward")
//       ]);
//     } catch (rewardError) {
//       console.error('Error handling rewards:', rewardError);
//       // Don't throw here, we still want to return the report
//     }

//     return report;
//   } catch(error) {
//     console.error('Error creating report:', error);
//     throw error; // Re-throw to handle in the component
//   }
//}

export async function createReport(
  userId: number,
  location: string,
  exactLocation: string,
  wasteType: string,
  amount: string,
  imageUrl?: string,
  verificationResult?: any
) {
  if (!userId || !location || !wasteType || !amount) {
    throw new Error("Missing required fields for report creation");
  }

  try {
    const [report] = await db
      .insert(Reports)
      .values({
        userId,
        location,
        exactLocation,
        wasteType,
        amount,
        imageUrl: imageUrl ?? null,
        verificationResult: verificationResult ?? null,
        status: "pending",
      })
      .returning()
      .execute();

    console.log("Report inserted successfully:", report);

    // Award points
    const pointsEarned = 10;
    console.log("User ID:", userId);
    console.log("Points to be awarded:", pointsEarned);
    const updateReward = await updateRewardPoints(userId, pointsEarned);
    console.log("Reward updated successfully:", updateReward);

    const create_transaction = await createTransaction(
      userId,
      "earned_report",
      10,
      "Points for report",
      report.id
    );
    console.log("transaction created;l");
    const create_notification = await createNotification(
      userId,
      `You've earned ${pointsEarned} points for reporting waste!`,
      "reward"
    );
    console.log("notification created", create_notification);

    //   console.log(`update Reward: ${updateReward}
    //     create_transaction: ${create_transaction}
    //     create_notification: ${create_notification}`)
    return report;
  } catch (error) {
    console.error("Error creating report:", error);
    return null;
  }
}

// export async function updateRewardPoints(userId: number, pointsToAdd: number) {
//   try {
//     if (userId == null || pointsToAdd == null) {
//       throw new Error("Missing required fields for updating reward points");
//     }

//     const [upsertedReward] = await db
//       .insert(Rewards)
//       .values({
//         userId,
//         points: pointsToAdd,
//         name: "Default Reward",
//         description: "Auto-generated reward",
//         collectionInfo: "Auto-update based on report",
//         isAvailable: true,
//       })
//       .onConflictDoUpdate({
//         target: Rewards.userId,
//         set: {
//           points: sql`${Rewards.points} + ${pointsToAdd}`,
//           updatedAt: sql`now()`,
//         },
//       })
//       .returning()
//       .execute();

//     console.log("Upserted reward:", upsertedReward);
//     return upsertedReward;
//   } catch (e) {
//     console.error("Error updating reward points:", e);
//     return null;
//   }
// }


// export async function updateRewardPoints(userId: number, pointsToAdd: number) {
//   try {
//     const [updatedReward] = await db
//       .update(Rewards)
//       .set({ 
//         points: sql`${Rewards.points} + ${pointsToAdd}`,
//         updatedAt: new Date()
//       })
//       .where(eq(Rewards.userId, userId))
//       .returning()
//       .execute();
//     return updatedReward;
//   } catch (error) {
//     console.error("Error updating reward points:", error);
//     return null;
//   }
// }

export async function updateRewardPoints(userId: number, pointsToAdd: number) {
  try {
    // Check if a reward already exists for the user
    const existingReward = await db
      .select()
      .from(Rewards)
      .where(eq(Rewards.userId, userId))
      .execute();

    let finalReturn;
    if (existingReward.length === 0) {
      // No reward yet — insert one
      const [newReward] = await db
        .insert(Rewards)
        .values({
          userId,
          points: pointsToAdd,
          name: "Initial Reward",
          collectionInfo: "First reward for this user",
          createdAt: new Date(),
          updatedAt: new Date(),
          isAvailable: true,
        })
        .returning()
        .execute();

      console.log("🎉 Created new reward row:", newReward);
      // return newReward;
      finalReturn
    } else {
      // Reward exists — update it
      const [updatedReward] = await db
        .update(Rewards)
        .set({
          points: sql`${Rewards.points} + ${pointsToAdd}`,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      console.log("✅ Updated reward:", updatedReward);
      // return updatedReward;  
      finalReturn = updatedReward;

    }
    return finalReturn;
  } catch (error) {
    console.error("🔥 Error updating/inserting reward points:", error);
    return null;
  }
}

export async function createTransaction(
  userId: number,
  type: "earned_report" | "earned_collect" | "redeemed",
  amount: number,
  description: string,
  reportId?: number
) {
  try {
    const [transaction] = await db
      .insert(Transactions)
      .values({
        userId,
        type,
        amount,
        description,
        ...(reportId ? { reportId } : {}), // set only if passed
      })
      .returning()
      .execute();

    return transaction;
  } catch (e) {
    console.error("Error creating transaction", e);
    return null;
  }
}

export async function createNotification(
  userId: number,
  message: string,
  type: string
) {
  try {
    const [notification] = await db
      .insert(Notifications)
      .values({
        userId,
        message,
        type,
      })
      .returning()
      .execute();
    return notification;
  } catch (e) {
    console.error("error creating notification", e);
  }
}

export async function getRecentReports(limit: number = 10) {
  try {
    //can be tailored and reused in your purchase reusable section ,where you want to ddisplay only three users with the highest point
    //NB: yours will be orderBy(Rewards)
    //also it will be location based
    //yours -> await- db.select().from(Rewards).orderBy(desc(Rewards.points)).limit(4).execute
    const reports = await db
      .select()
      .from(Reports)
      .orderBy(desc(Reports.createdAt))
      .limit(limit)
      .execute();
    return reports;
  } catch (e) {
    console.error("Error fetching recent reports", e);
    return [];
  }
}


//get all report 
export async function getAllReports() {
  try {
    //can be tailored and reused in your purchase reusable section ,where you want to ddisplay only three users with the highest point
    //NB: yours will be orderBy(Rewards)
    //also it will be location based
    //yours -> await- db.select().from(Rewards).orderBy(desc(Rewards.points)).limit(4).execute
    const reports = await db
      .select()
      .from(Reports)
      .execute();
    return reports;
  } catch (e) {
    console.error("Error fetching recent reports", e);
    return [];
  }
}


export async function getWasteCollectionTasks(limit: number = 20) {
  try {
    const tasks = await db
      .select({
        id: Reports.id,
        location: Reports.location,
        exactLocation: Reports.exactLocation,
        wasteType: Reports.wasteType,
        amount: Reports.amount,
        status: Reports.status,
        date: Reports.createdAt,
        collectorId: Reports.collectorId,
      })
      .from(Reports)
      .limit(limit)
      .execute();

    return tasks.map(task => ({
      ...task,
      date: task.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
    }));
  } catch (error) {
    console.error("Error fetching waste collection tasks:", error);
    return [];
  }
}

export async function saveReward(userId: number, amount: number) {
  try {
    const [reward] = await db
      .insert(Rewards)
      .values({
        userId,
        name: 'Waste Collection Reward',
        collectionInfo: 'Points earned from waste collection',
        points: amount,
        // level: 1,
        isAvailable: true,
      })
      .returning()
      .execute();

      const pointsEarned = 15;
      const create_reward = await updateRewardPoints(userId, pointsEarned);

      const create_notification = await createNotification(
      userId,
      `You've earned ${amount} points for collecting waste!`,
      "reward"
    );
    // Create a transaction for this reward
    await createTransaction(userId, 'earned_collect', 15, 'Points earned for collecting waste');
    
    return {reward: reward, create_reward, create_notification};
  } catch (error) {
    console.error("Error saving reward:", error);
    throw error;
  }
}

export async function saveCollectedWaste(reportId: number, collectorId: number, verificationResult: any) {
  try {
    const [collectedWaste] = await db
      .insert(collectedWastes)
      .values({
        reportId,
        collectorId,
        collectionDate: new Date(),
        status: 'verified',
      })
      .returning()
      .execute();
    return collectedWaste;
  } catch (error) {
    console.error("Error saving collected waste:", error);
    throw error;
  }
}

export async function updateTaskStatus(reportId: number, newStatus: string, collectorId?: number) {
  try {
    const updateData: any = { status: newStatus };
    if (collectorId !== undefined) {
      updateData.collectorId = collectorId;
    }
    const [updatedReport] = await db
      .update(Reports)
      .set(updateData)
      .where(eq(Reports.id, reportId))
      .returning()
      .execute();
    return updatedReport;
  } catch (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
}

export async function getAllRewards() {
  try {
    const rewards = await db
      .select({
        id: Rewards.id,
        userId: Rewards.userId,
        points: Rewards.points,
        level: Rewards.level,
        createdAt: Rewards.createdAt,
        userName: Users.name,
      })
      .from(Rewards)
      .leftJoin(Users, eq(Rewards.userId, Users.id))
      .orderBy(desc(Rewards.points))
      .execute();

    return rewards;
  } catch (error) {
    console.error("Error fetching all rewards:", error);
    return [];
  }
}


export async function getAvailableRewards(userId: number) {
  try {
    console.log('Fetching available rewards for user:', userId);
    
    // Get user's total points
    const userTransactions = await getRewardTransactions(userId);
    const userPoints = userTransactions?.reduce((total, transaction) => {
      return transaction.type.startsWith('earned') ? total + transaction.amount : total - transaction.amount;
    }, 0);

    console.log('User total points:', userPoints);

    // Get available rewards from the database
    const dbRewards = await db
      .select({
        id: Rewards.id,
        name: Rewards.name,
        cost: Rewards.points,
        description: Rewards.description,
        collectionInfo: Rewards.collectionInfo,
      })
      .from(Rewards)
      .where(eq(Rewards.isAvailable, true))
      .execute();

    console.log('Rewards from database:', dbRewards);

    // Combine user points and database rewards
    const allRewards = [
      {
        id: 0, // Use a special ID for user's points
        name: "Your Points",
        cost: userPoints,
        description: "Redeem your earned points",
        collectionInfo: "Points earned from reporting and collecting waste"
      },
      ...dbRewards
    ];

    console.log('All available rewards:', allRewards);
    return allRewards;
  } catch (error) {
    console.error("Error fetching available rewards:", error);
    return [];
  }
}



export async function redeemReward(userId: number, rewardId: number) {
  try {
    const userReward = await getOrCreateReward(userId) as any;
    
    if (rewardId === 0) {
      // Redeem all points
      const [updatedReward] = await db.update(Rewards)
        .set({ 
          points: 0,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(userId, 'redeemed', userReward.points, `Redeemed all points: ${userReward.points}`);

      return updatedReward;
    } else {
      // Existing logic for redeeming specific rewards
      const availableReward = await db.select().from(Rewards).where(eq(Rewards.id, rewardId)).execute();

      if (!userReward || !availableReward[0] || userReward.points < availableReward[0].points) {
        throw new Error("Insufficient points or invalid reward");
      }

      const [updatedReward] = await db.update(Rewards)
        .set({ 
          points: sql`${Rewards.points} - ${availableReward[0].points}`,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(userId, 'redeemed', availableReward[0].points, `Redeemed: ${availableReward[0].name}`);

      return updatedReward;
    }
  } catch (error) {
    console.error("Error redeeming reward:", error);
    throw error;
  }
}

export async function getOrCreateReward(userId: number) {
  try {
    let [reward] = await db.select().from(Rewards).where(eq(Rewards.userId, userId)).execute();
    if (!reward) {
      [reward] = await db.insert(Rewards).values({
        userId,
        name: 'Default Reward',
        collectionInfo: 'Default Collection Info',
        points: 0,
        level: 1,
        isAvailable: true,
      }).returning().execute();
    }
    return reward;
  } catch (error) {
    console.error("Error getting or creating reward:", error);
    return null;
  }
}



export async function UploadForSale(
  userId:number,
  wasteType: string,
  role: string,
  quantity: string,
  phone: string,
  location: string,
  exactLocation: string,
  email: string,
  
){
  try {
    const seller = await db
      .insert(Sellers)
      .values({
        userId,
        wasteType,
        role,
        quantity,
        phone,
        location,
        exactLocation,
        email,
        createdAt: new Date(),
      })
      .returning()
      .execute();

    return seller;
  } catch (error) {
    console.error("Error uploading for sale:", error);
    throw error;
  }
}


//update the status whether it sold or searching
export async function updateSellerStatus(sellerId: number, newStatus: 'searching' | 'sold') {
  try {
    const updated = await db
      .update(Sellers)
      .set({ status: newStatus })
      .where(eq(Sellers.id, sellerId))
      .returning()
      .execute();

    return updated[0];
  } catch (err) {
    console.error("Failed to update seller status:", err);
    throw err;
  }
}



export async function getSellersByUser(userId: number) {
  return await db
    .select()
    .from(Sellers)
    .where(eq(Sellers.userId, userId))
    .orderBy(desc(Sellers.createdAt)); // optional sorting
}



export async function UploadForBuy(
  userId:number,
  preferredWasteType: string,
  role: string,
  phone: string,
  maxDistanceKm: number,
  location: string,
  exactLocation: string,
){
  try{
    const [newBuyer] = await db
    .insert(Buyers)
    .values({
      userId,
      preferredWasteType,
      role,
      phone,
      maxDistanceKm,
      location,
      exactLocation,
      status: 'searching', // default value, but you can explicitly set it
    })
    .returning()
    .execute()

    return newBuyer;
  }catch(error) {
    console.error("Error uploading for buy:", error);
    throw error;
  }
}


export async function getBuyersByUser(userId: number) {
  try {
    const buyers = await db
      .select()
      .from(Buyers)
      .where(eq(Buyers.userId, userId));
    return buyers;
  } catch (error) {
    console.error('Error fetching buyers:', error);
    return [];
  }
}


//update the status whether it bought or searching
export async function updateBuyerStatus(buyerId: number, newStatus: 'searching' | 'bought') {
  try {
    const updated = await db
      .update(Buyers)
      .set({ status: newStatus })
      .where(eq(Buyers.id, buyerId))
      .returning()
      .execute();

    return updated[0];
  } catch (err) {
    console.error("Failed to update seller status:", err);
    throw err;
  }
}






// export async function getSellersByWasteType(wasteType: string) {
//   try {
//     const allSellers = await db.select().from(Sellers);
//     console.log("✅ All sellers in DB:", allSellers);

//     const cleaned = wasteType.trim().toLowerCase();

//     const sellers = await db
//       .select()
//       .from(Sellers)
//       .where(sql`LOWER(TRIM(${Sellers.wasteType})) = ${cleaned}`);

//     console.log("✅ Matching sellers found:", sellers);
//     return sellers;
//   } catch (error) {
//     console.error("❌ Error fetching sellers by waste type:", error);
//     throw new Error("Could not fetch sellers.");
//   }
// }


export async function getSellersByWasteType(wasteType: string) {
  try {
    const cleaned = `%${wasteType.trim().toLowerCase()}%`; // Add wildcard %

    const sellers = await db
      .select()
      .from(Sellers)
      .where(sql`LOWER(${Sellers.wasteType}) LIKE ${cleaned}`);

    console.log("✅ Fuzzy matching sellers found:", sellers);
    return sellers;
  } catch (error) {
    console.error("❌ Error fetching sellers by waste type:", error);
    throw new Error("Could not fetch sellers.");
  }
}




//match with Gemini

// export async function matchWithGemini({
//   buyerLocation,
//   exactLocation, // Include exact location for more accurate distance calculations
//   maxDistanceKm,
//   sellerList,
// }: {
//   buyerLocation: string;
//   exactLocation: string; // buyer exact location for accurate distance calculations
//   maxDistanceKm: number;
//   sellerList: {
//     sellerId: number;
//     location: string;
//     exactLocation: string;
//     points: number;
//   }[];
// }) {
//   try {
//     const genAI = new GoogleGenerativeAI(geminiApiKey);
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//     const prompt = `
// You are an assistant helping match a buyer with sellers based on location and reward points.

// Buyer is located at:
// "${buyerLocation}"

// Maximum acceptable distance: ${maxDistanceKm} km

// Here is a list of potential sellers:
// ${sellerList.map(s => `Seller ID: ${s.sellerId}, Location: ${s.location}, Points: ${s.points}`).join('\n')}

// Your task:
// -You are good with the world map, so ensure Location of the seller tell us whether seller is within buyer Location(Be accurate as possible)
// - Calculate the distance between the buyer and each seller
// - Remove any sellers who are farther than ${maxDistanceKm} km
// - From the remaining sellers, sort by:
//   1. Shortest distance
//   2. Highest points

// Notice: the example below should be the format of your response(let it guide you in how you will strucuture your own response)

// Your response should not look like this format :
//  \`\`\`\  json
// [
//   {
//     "sellerId": 1,
//     "distanceKm": 1.5,
//     "points": 50,
//     "BuyerCloserToSeller": true or false
//   },
//   {
//     "sellerId": 3,
//     "distanceKm": 1.8,
//     "points": 30,
//     "BuyerCloserToSeller": true or false
//   }
// ]
// \`\`\`

// instead it should look like this format:
// [
//   {
//     "sellerId": 1,
//     "distanceKm": 1.5,
//     "points": 50,
//     "BuyerCloserToSeller": true or false
//   },
//   {
//     "sellerId": 3,
//     "distanceKm": 1.8,
//     "points": 30,
//     "BuyerCloserToSeller": true or false
//   }
// ]

// - No code blocks (no triple backticks like \`\`\` or \`\`\`json)
// - No explanations
// - No text before or after the JSON
// - No labels like "Here's your response:" or "Sure, here is the data:"

// ❗Only return the raw JSON array. Nothing else.







// `;
//     console.log('Seller List:', sellerList);
//     const result = await model.generateContent([prompt]);
//     const response = await result.response;
//     const text = response.text();

//     console.log("Raw Gemini response:", text);

//     // Parse Gemini's plain JSON response
//     const matchedSellers = JSON.parse(text);
//     return matchedSellers;
//   } catch (error) {
//     console.error("Error in Gemini matchmaking:", error);
//     throw new Error("Failed to match sellers using Gemini.");
//   }
// }



export async function matchWithGemini({
  buyerLocation,
  exactLocation, // Buyer's GPS coordinates
  maxDistanceKm,
  sellerList,
}: {
  buyerLocation: string;
  exactLocation: string; // e.g., "Lat: 5.6037, Lng: -0.1870"
  maxDistanceKm: number;
  sellerList: {
    userId: number;
    sellerId: number;
    location: string;         // General address
    exactLocation: string;    // GPS format: "Lat: xxxxx, Lng: xxxxx"
    points: number;
    email?: string;  // optional, passed but not exposed to Gemini
    phone?: string;  // optional, passed but not exposed to Gemini
    status?: string;
  }[];
}) {
  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an assistant helping match a buyer with sellers based on real-world distance and reward points.

 Buyer's general location:
"${buyerLocation}"

 Buyer's exact location (GPS coordinates):
"${exactLocation}"

 Maximum acceptable distance: ${maxDistanceKm} km

 Sellers:
Each seller includes their general location and exact GPS coordinates. Use their coordinates for accurate distance comparison.

${sellerList.map(s => 
  ` Seller ID: ${s.sellerId}, Location: ${s.location}, ExactLocation: ${s.exactLocation}, Points: ${s.points} `
).join('\n')}

🔍 Your Task:
- Use the buyer and seller GPS coordinates (latitude and longitude) to calculate real-world distance (in km).
- Exclude any seller farther than ${maxDistanceKm} km from the buyer.
- Sort remaining sellers by:
   1. Shortest distance
   2. Highest reward points
- Indicate if the seller is within the buyer's acceptable range.

Your response should not look like this format:
\`\`\`json
[
  {
    "sellerId": 1,
    "distanceKm": 1.5,
    "points": 50,
    "BuyerCloserToSeller": true
  },
  {
    "sellerId": 3,
    "distanceKm": 1.8,
    "points": 30,
    "BuyerCloserToSeller": true
  }
]
\`\`\`

 Instead it should look like this format :
[
  {
    "sellerId": 1,
    "distanceKm": 1.5,
    "points": 50,
    "BuyerCloserToSeller": true
  },
  {
    "sellerId": 3,
    "distanceKm": 1.8,
    "points": 30,
    "BuyerCloserToSeller": true
  }
]

 Strict Output Rules:
- NO code blocks
- NO explanations
- NO labels or extra text
- ONLY the raw JSON array

// ❗Only return the raw JSON array. Nothing else. ()
once again don't wrap your response in \`\`\`json \`\`\`
    `;

    console.log('🛰️ Seller List Sent to Gemini:', sellerList);
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    const text = response.text();

    console.log(" Raw Gemini response:", text);

    const matchedSellers = JSON.parse(text);
    //return matchedSellers;
  const enrichedResults = matchedSellers.map((match) => {
  const original = sellerList.find((s) => s.sellerId === match.sellerId);
  return {
    ...match, // includes sellerId, distanceKm, points, BuyerCloserToSeller
    userId: original?.userId ?? null,
    email: original?.email ?? null,
    phone: original?.phone ?? null,
    status: original?.status ?? null,
    location: original?.location ?? null,
    exactLocation: original?.exactLocation ?? null,
  };
});

return enrichedResults;

  } catch (error) {
    console.error(" Error in Gemini matchmaking:", error);
    throw new Error("Failed to match sellers using Gemini.");
  }
}
