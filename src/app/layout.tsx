'use client'
import './globals.css'

import { LoadScript } from '@react-google-maps/api'
import { Inter } from 'next/font/google'
import { WagmiProvider } from "@web3auth/modal/react/wagmi";
import { Toaster } from 'react-hot-toast'
import { Web3AuthProvider } from '@web3auth/modal/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import web3AuthContextConfig from '../../utils/db/web3AuthContext'

const inter = Inter({ subsets: ['latin'] })


const queryClient = new QueryClient();
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}
>) {



  return (
    <html lang='en'>
      <body className={inter.className}>
        <Web3AuthProvider config={web3AuthContextConfig}>    {/* // IMP START - Setup Wagmi Provider */}
          <QueryClientProvider client={queryClient}>
            <WagmiProvider>
              <LoadScript
                googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
                libraries={['places']}
              >
                {children}
                <Toaster />
              </LoadScript>
            </WagmiProvider>
          </QueryClientProvider>
        </Web3AuthProvider>
      </body>
    </html>
  )

}
