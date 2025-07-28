"use server";

import { db } from "./dbConfig";
import { Users, Notifications, Transactions, Reports, Rewards,collectedWastes,  Buyers,Sellers } from "./schema";
import { eq, sql, and, desc } from "drizzle-orm";

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

export async function updateRewardPoints(userId: number, pointsToAdd: number) {
  try {
    if (userId == null || pointsToAdd == null) {
      throw new Error("Missing required fields for updating reward points");
    }

    const [upsertedReward] = await db
      .insert(Rewards)
      .values({
        userId,
        points: pointsToAdd,
        name: "Default Reward",
        description: "Auto-generated reward",
        collectionInfo: "Auto-update based on report",
        isAvailable: true,
      })
      .onConflictDoUpdate({
        target: Rewards.userId,
        set: {
          points: sql`${Rewards.points} + ${pointsToAdd}`,
          updatedAt: sql`now()`,
        },
      })
      .returning()
      .execute();

    console.log("Upserted reward:", upsertedReward);
    return upsertedReward;
  } catch (e) {
    console.error("Error updating reward points:", e);
    return null;
  }
}


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

// export async function updateRewardPoints(userId: number, pointsToAdd: number) {
//   try {
//     // Check if a reward already exists for the user
//     const existingReward = await db
//       .select()
//       .from(Rewards)
//       .where(eq(Rewards.userId, userId))
//       .execute();

//     let finalReturn;
//     if (existingReward.length === 0) {
//       // No reward yet — insert one
//       const [newReward] = await db
//         .insert(Rewards)
//         .values({
//           userId,
//           points: pointsToAdd,
//           name: "Initial Reward",
//           collectionInfo: "First reward for this user",
//           createdAt: new Date(),
//           updatedAt: new Date(),
//           isAvailable: true,
//         })
//         .returning()
//         .execute();

//       console.log("🎉 Created new reward row:", newReward);
//       // return newReward;
//       finalReturn
//     } else {
//       // Reward exists — update it
//       const [updatedReward] = await db
//         .update(Rewards)
//         .set({
//           points: sql`${Rewards.points} + ${pointsToAdd}`,
//           updatedAt: new Date(),
//         })
//         .where(eq(Rewards.userId, userId))
//         .returning()
//         .execute();

//       console.log("✅ Updated reward:", updatedReward);
//       // return updatedReward;  
//       finalReturn = updatedReward;

//     }
//     return finalReturn;
//   } catch (error) {
//     console.error("🔥 Error updating/inserting reward points:", error);
//     return null;
//   }
// }

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



export async function getWasteCollectionTasks(limit: number = 20) {
  try {
    const tasks = await db
      .select({
        id: Reports.id,
        location: Reports.location,
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
