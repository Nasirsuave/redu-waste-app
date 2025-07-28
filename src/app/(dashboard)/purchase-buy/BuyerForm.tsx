// 'use client'

// import { useState } from 'react';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import SellerList from './SellerList';

// export default function BuyerForm() {
//   const [wasteType, setWasteType] = useState('');
//   const [location, setLocation] = useState('');
//   const [maxDistance, setMaxDistance] = useState<null | number>(null); // Default max distance
//   const [preferredWasteType, setPreferredWasteType] = useState('');
//   const [sellers, setSellers] = useState([]);

//   const findSellers = async () => {
//     const res = await fetch('/api/find-sellers', {
//       method: 'POST',
//       body: JSON.stringify({ wasteType, location }),
//     });
//     const data = await res.json();
//     setSellers(data);
//   };

//   return (
//     <div className="space-y-6">
//       <div className="space-y-3 bg-white p-6 rounded-2xl shadow-md">
//         <h2 className="text-xl font-semibold">Buy Waste</h2>
//         <Input placeholder="Waste Type" value={wasteType} onChange={(e) => setWasteType(e.target.value)} />
//         <Input placeholder="Your Location" value={location} onChange={(e) => setLocation(e.target.value)} />
//         <Input type="number" placeholder="Max Distance (km)" value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} />
//         <Input placeholder="Preferred Waste Type" value={preferredWasteType} onChange={(e) => setPreferredWasteType(e.target.value)} />

//         <Button onClick={findSellers} className="w-full mt-4  bg-green-600 hover:bg-green-700 text-white py-3 text-lg rounded-xl transition-colors duration-300 flex items-center justify-center">Search Sellers</Button>
//       </div>

//       {sellers.length > 0 && <SellerList sellers={sellers} />}
//     </div>
//   );
// }



'use client'

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SellerList from './SellerList';
import { Loader, CheckCircle2, SearchCheck } from 'lucide-react';

type Transaction = {
  id: number;
  sellerName: string;
  wasteType: string;
  status: 'searching' | 'bought';
};

export default function BuyerForm() {
  const [wasteType, setWasteType] = useState('');
  const [location, setLocation] = useState('');
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [preferredWasteType, setPreferredWasteType] = useState('');
  const [sellers, setSellers] = useState([]);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 1,
      sellerName: 'John Doe',
      wasteType: 'Plastic',
      status: 'searching',
    },
    {
      id: 2,
      sellerName: 'Sarah Lee',
      wasteType: 'Glass',
      status: 'bought',
    },
  ]);

  const findSellers = async () => {
    const res = await fetch('/api/find-sellers', {
      method: 'POST',
      body: JSON.stringify({ wasteType, location }),
    });
    const data = await res.json();
    setSellers(data);
  };

  const toggleStatus = (id: number) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'searching' ? 'bought' : 'searching' }
          : t
      )
    );
  };

  return (
    <div className="space-y-8">
      {/* Buy Form */}
      <div className="space-y-3 bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-xl font-semibold">Buy Waste</h2>
        <Input placeholder="Waste Type" value={wasteType} onChange={(e) => setWasteType(e.target.value)} />
        <Input placeholder="Your Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Input type="number" placeholder="Max Distance (km)" value={maxDistance ?? ''} onChange={(e) => setMaxDistance(Number(e.target.value))} />
        <Input placeholder="Preferred Waste Type" value={preferredWasteType} onChange={(e) => setPreferredWasteType(e.target.value)} />

        <Button
          onClick={findSellers}
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-3 text-lg rounded-xl transition-colors duration-300 flex items-center justify-center"
        >
          <SearchCheck className="mr-2" size={20} />
          Search Sellers
        </Button>
      </div>

      {/* Sellers List */}
      {sellers.length > 0 && <SellerList sellers={sellers} />}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <table className="w-full text-sm text-left border">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3">Seller</th>
              <th className="p-3">Waste Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-t">
                <td className="p-3">{tx.sellerName}</td>
                <td className="p-3">{tx.wasteType}</td>
                <td className="p-3 flex items-center space-x-2">
                  {tx.status === 'searching' ? (
                    <>
                      <Loader className="text-yellow-500 animate-spin" size={16} />
                      <span className="text-yellow-600 font-medium">Negotiating</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="text-green-600" size={16} />
                      <span className="text-green-600 font-medium">Bought</span>
                    </>
                  )}
                </td>
                <td className="p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatus(tx.id)}
                    className="text-xs"
                  >
                    Mark as {tx.status === 'searching' ? 'Bought' : 'Searching'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
