import { db } from './dbConfig'
import { Users,Notifications,Transactions,Reports,Rewards } from './schema'
import { eq, sql, and, desc} from 'drizzle-orm'



export async function createUser(email:string, name: string){
    try{
     const [user] = await db.insert(Users).values({email,name}).returning().execute()
     return user
    }catch(error){
      console.error('Error creating user', error)
      return null
    }
}


export async function getUserByEmail(email: string){
    try{
      const [user] = await db.select().from(Users).where(eq(Users.email,email))
      return user
    }catch(error){
       console.error('Error fetching user email',error)
       return null
    }
}


export async function getUnreadNotification(userId: number){
    try{
      return db.select().from(Notifications).where(and(eq(Notifications.userId,userId),eq(Notifications.isRead,false)))
    }catch(error){
      console.error('Error fetching unread notifications',error)
      return null
    }
}



export async function getUserBalance(userId: number):Promise<number>{
    const transactions = await getRewardTransactions(userId) || [];
    
    if(!transactions) return 0;
    const balance = transactions.reduce((acc:number,transaction:any)=> {
      return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
    },0)
    return Math.max(balance,0)
}


export async function getRewardTransactions(userId: number){
   try{
   const transactions = db.select({
    id: Transactions.id,
    type: Transactions.type,
    amount: Transactions.amount,
    description: Transactions.description,
    date: Transactions.date
   }).from(Transactions).where(eq(Transactions.userId,userId)).orderBy(desc(Transactions.date)).limit(10).execute();

  const formattedTransactions = transactions.map(t => ({
    ...t,
    date: t.date.toISOString().split('T')[0]
  }))

  return formattedTransactions

   }catch(error){
    console.error('Error fetching reward transaction',error)
    return null
   }
}


export async function markNotificationAsRead(notificationId: number){
  try{
    await db.update(Notifications).set({isRead:true}).where(eq(Notifications.id,notificationId))
  }catch(error){
    console.error('Error marking notification as read', error)
  }
}


export async function createReport(
  userId: number,
  location: string,
  wasteType: string,
  amount: string,
  imageUrl?: string,
  verificationResult?: any,

){
  try{
    const [report] = await db.insert(Reports).values({userId,location,wasteType,amount,imageUrl,verificationResult,status:"pending"}).returning().execute()
    const pointEarned = 10;
    //updateRewardPoints
    await updateRewardPoints(userId, pointEarned)
    //createTransaction
    //createNotification
  }catch(e){
  }
}


export async function updateRewardPoints(userId: number, pointsToAdd:number) {
  try{
    const [updatedReward] = await db.update(Rewards).set({
      points: sql`${Rewards.points} + ${pointsToAdd}`
    }).where(eq(Rewards.userId, userId)).returning().execute();
    return updatedReward;
  }catch(e){
    console.error('Error updating reward points',e)
    return null;
  }
}


export async function createTransaction(userId:number, type:'earned_report' | 'earned_collect' | 'redeemed', amount:number, description:string){
  try{
    const [transaction] = db.in
  }catch(e){

  }
}