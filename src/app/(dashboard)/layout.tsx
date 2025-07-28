'use client'

import { LoadScript } from '@react-google-maps/api'


import { useState, useEffect } from 'react'

import { Inter } from 'next/font/google'


//sidebar

import { WagmiProvider } from "@web3auth/modal/react/wagmi";
import { Toaster } from 'react-hot-toast'
import Sidebar from '@/components/Sidebar'
import { SidebarOpen } from 'lucide-react'
import { Web3AuthProvider } from '@web3auth/modal/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from '@/components/Header'
import web3AuthContextConfig from '../../../utils/db/web3AuthContext';
import { getUserByEmail,getAvailableRewards } from '../../../utils/db/action'

const inter = Inter({ subsets: ['latin'] })


const queryClient = new QueryClient();
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}
>) {

  const [sidebarOpen, setsidebarOpen] = useState(false)
  const [totalEarnings, settotalEarnings] = useState(0)

   useEffect(() => {
    const fetchTotalEarnings = async () => {
      try{
        const userEmail = localStorage.getItem('userEmail');

        if(userEmail){
          const user = await getUserByEmail(userEmail)
          console.log('user from layout', user);

          if(user){
            const availableRewards = await getAvailableRewards(user.id) as any
            settotalEarnings(availableRewards)
         }
        }
      }catch(error){
        console.error("Error fetching total earnings:", error);
      }
   }
   fetchTotalEarnings()
  },[])
  return (

    <div className='min-h-screen bg-gray-50 flex flex-col '>
      <Header onMenuClick={() => setsidebarOpen(!sidebarOpen)} totalEarnings={totalEarnings} />
      <div className='flex '>
        {/*sidebar */}
        <Sidebar open={sidebarOpen} />
        {/* inherit from report,collect, 
             Content inside {children} changes depending on the route (/, /report, etc.)*/}
        <main className='flex-1 p-4 lg:p-8 ml-0 lg:ml-64 transition-all duration-300 bg-blue-100'>
          {children}
        </main>
      </div>
    </div>
  )

}
