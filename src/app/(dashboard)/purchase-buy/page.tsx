'use client'

import { useState } from 'react';
import SellerForm from './SellerForm';
import BuyerForm from './BuyerForm';
import { Button } from '@/components/ui/button';
import { UserPlus, ShoppingCart } from 'lucide-react';

export default function PurchaseBuyPage() {
  const [role, setRole] = useState<'seller' | 'buyer'>('seller');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Purchase & Sell Reusable Waste</h1>

      <div className="flex justify-center gap-4">
        <Button variant='outline'  className={role === 'seller' ? 'bg-green-500 text-white hover:bg-green-600 transition-colors duration-300' : ''} onClick={() => setRole('seller')}>
            <UserPlus size={18}  />
          I am a Seller
        </Button>
        <Button variant='outline' className={role === 'buyer' ? 'bg-green-500 text-white hover:bg-green-600 transition-colors duration-300' : ''} onClick={() => setRole('buyer')}>
         <ShoppingCart size={18} />
          I am a Buyer
        </Button>
      </div>

      {role === 'seller' ? <SellerForm /> : <BuyerForm />}
    </div>
  );
}
