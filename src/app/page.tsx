"use client"
import { ArrowRight, Leaf, Recycle, Users, Coins, MapPin, ChevronRight, Trash2, LogIn }  from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react"
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { createUser, getUserByEmail } from '../../utils/db/action'


function AnimatedGlobe() {
  return (
    <div className='relative w-32 h-32 mx-auto mb-8'>
      <div className='absolute inset-0 rounded-full  bg-green-500 opacity-20 animate-pulse'></div>
      <div className='absolute inset-2 rounded-full bg-green-400 opacity-40 animate-ping'></div>
      <div className='absolute inset-2 rounded-full bg-green-300 opacity-60 animate-spin'></div>
      <div className='absolute inset-2 rounded-full bg-green-200 opacity-80 animate-bounce'></div>
      <Trash2 className='absolute inset-0 m-auto h-16 w-16 text-green-600 animate-pulse'/>

    </div>
  )
}


export default function Home(){
  const { connect, isConnected, loading: connectLoading } = useWeb3AuthConnect()
  const { userInfo } = useWeb3AuthUser()
  const [stats] = useState({
    wasteCollected: '20 Kg',
    reportsSubmitted: 50,
    tokensEarned: 150,
    co2Offset: '50 Kg'
  })

  const handleLogin = async () => {
    try {
      await connect()
      
      // Wait a moment for userInfo to be populated after connect
      // setTimeout(async () => {

        // if (userInfo?.email) {
        //   // Check if user already exists
        //   const existingUser = await getUserByEmail(userInfo.email)
          
        //   if (!existingUser) {
        //     // Create new user if they don't exist
        //     await createUser(
        //        userInfo.email,
        //        userInfo.name || '',
        //     )
        //     toast.success('Account created successfully!')
        //   } else {
        //     toast.success('Welcome back!')
        //   }
        // }
      // }, 1000)
      
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Failed to login. Please try again.')
    }
  }
  
  return (
    <div className='container mx-auto px-4 py-16'>
      <section className='text-center mb-20'>
        <AnimatedGlobe />
        <h1 className='text-6xl font-bold mb-8 text-gray-800 tracking-tight'>
          Reduce-Waste <span className='text-green-600'>:Positive Volunteerism</span>
        </h1>
        <p className='text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8'>
          Join our community in making waste management more efficient and rewarding
        </p>
        {!isConnected ? (
          <Button 
            onClick={handleLogin} 
            className='bg-green-600 hover:bg-green-700 text-white text-lg py-6 px-10 rounded-full'
            disabled={connectLoading}
          >
            {connectLoading ? (
              <span className='flex items-center'>
                <span className='animate-spin mr-2'>⚪</span> Connecting...
              </span>
            ) : (
              <span className='flex items-center'>
                <LogIn className='mr-2' /> Login to Start
              </span>
            )}
          </Button>
        ) : (
          <Link href="/report">
            <Button className='bg-green-600 hover:bg-green-700 text-white text-lg py-6 px-10 rounded-full'>
              Report Waste <ArrowRight className='ml-2' />
            </Button>
          </Link>
        )}
      </section>

      <section className='grid md:grid-cols-3 gap-10 mb-20'>
          <FeatureCard 
          icon={Leaf}
          title='Eco-Friendly'
          description='We are commited to reducing waste and promoting sustainability.'
          />
          <FeatureCard 
          icon={Coins}
          title='Earn Rewards'
          description='You can make a livelihood while postively impacting the environment'
          />
          <FeatureCard 
          icon={Leaf}
          title='Commuity Driven'
          description='We are commited to reducing waste and promoting sustainability.'
          />
      </section>

      {isConnected && (
        <section className='bg-white p-10 rounded-3xl shadow-lg mb-20 transform hover:scale-105 transition-all duration-300'>
          <h2 className='text-4xl font-bold mb-12 text-center text-gray-800'>
            Our Contribution
          </h2>
          <div className='grid md:grid-cols-4 gap-6'>
            <ImapactCard title='Waste collected' value={stats.wasteCollected} icon={Recycle}/>
            <ImapactCard title='Report Submitted' value={stats.reportsSubmitted} icon={MapPin}/>
            <ImapactCard title='Tokens Earned' value={stats.tokensEarned} icon={Coins}/>
            <ImapactCard title='CO2 Offset' value={stats.co2Offset} icon={Leaf}/>


        </div>
      </section>
      )}

      <section className='text-center py-10'>
        <h2 className='text-3xl font-bold mb-6'>Ready to Make a Difference?</h2>
        <p className='text-gray-600 mb-8'>
          Start your journey towards a cleaner environment today.
        </p>
        {!isConnected && (
          <Button 
            onClick={handleLogin}
            className='bg-green-600 hover:bg-green-700 text-white'
          >
            Get Started <ArrowRight className='ml-2' />
          </Button>
        )}
      </section>
    </div>
  )
}


function FeatureCard({icon:Icon, title, description}:{icon:React.ElementType; title:string, description:string}){

    return(
      <div className='bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
      ease-in-out flex flex-col items-center text-center'>
        <div className='bg-blue-100 rounded-full p-4  mb-6'>
          <Icon className='h-8 w-8 text-green-600'/>
        </div>
        <h3 className='text-xl font-semibold mb-4 text-gray-800'>{title}</h3>
        <p className='text-gray-600 leading-relaxed'>{description}</p>
      </div>
    )
}



function ImapactCard({title,value , icon:Icon}:{title:string; value:string|number; icon:React.ElementType}){
 
  return(
    <div className='p-6 rounded-xl bg-gray-50 border transitiona-all duration-300 ease-in-out hover:shadow-md'>
        <Icon className='h-10 w-10 text-green-500 mb-4'/>
        <p className='text-3xl font-bold mb-2 text-gray-800'>{value}</p>
        <p className='text-sm text-gray-600'>{title}</p>{" "}
    </div>
  );
}