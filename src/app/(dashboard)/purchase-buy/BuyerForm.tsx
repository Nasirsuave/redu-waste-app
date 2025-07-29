


'use client'

import { useState,useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SellerList from './SellerList';
import { getUserByEmail,UploadForBuy,getBuyersByUser,updateBuyerStatus } from '../../../../utils/db/action';
import { Loader, CheckCircle2, SearchCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';


type Transaction = {
  id: number;
  preferredWasteType: string;
  maxDistanceKm: number;
  status: 'searching' | 'bought';
};



export default function BuyerForm() {
 const [loading, setLoading] = useState(true)
const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)

const [form, setForm] = useState({
  location: '',
  maxDistanceKm: 0,
  phone: '',
  preferredWasteType: '',
});

  const [sellers, setSellers] = useState([]);
const [transactions, setTransactions] = useState<Array<{
  id: number;
  preferredWasteType: string;
  maxDistanceKm: number;
  status: string;
}>>([]);


    const findSellers = async () => {
        //do something to find sellers
        try{
            if (!user) {
            toast.error('User not loaded. Please log in again.');
            return;
            }
        const { location, phone, preferredWasteType, maxDistanceKm } = form;

        if (!preferredWasteType || !phone || !location || !maxDistanceKm ) {
            toast.error('Please fill in all fields.');
            return;
        }

        const newBuyer = await UploadForBuy(
        user.id, // Assuming you're passing userId from userInfo
        preferredWasteType,
        "buyer",
        phone,
        maxDistanceKm,
        location
    );

    const updatedBuyers = await getBuyersByUser(user.id);
    setTransactions(updatedBuyers);

        toast.success('Buyer info uploaded successfully');

        }catch(error){
            console.error('Error finding sellers:', error);
            toast.error('Failed to find sellers');
        }
       
    }

  const toggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'searching' ? 'bought' : 'searching';
    try{
        updateBuyerStatus(id, newStatus);
        toast.success(`Status updated to ${newStatus}`);
        // Optionally: refresh the list of sellers or transactions
    }catch(error){
        toast.error('Failed to update status');
    }
  };

//    const toggleStatus = async (id: number, currentStatus: string) => {
//       const newStatus = currentStatus === 'searching' ? 'sold' : 'searching';
//       try {
//         await updateSellerStatus(id, newStatus);
//         toast.success(`Status updated to ${newStatus}`);
//         //fetchSellers(); // Refresh list
//       } catch (err) {
//         toast.error('Failed to update status');
//       }
//     };

   useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const userEmail = localStorage.getItem('userEmail');
        console.log('User email from localStorage:', userEmail);
  
        if (userEmail) {
        //   setForm((prev) => ({ ...prev, email: userEmail }));
          const fetchedUser = await getUserByEmail(userEmail);
          console.log('Returning the user by email:', fetchedUser);
  
          if (fetchedUser) {
            setUser(fetchedUser);
             const buyers = await getBuyersByUser(fetchedUser.id);
             setTransactions(buyers);
          } else {
            toast.error('User not found. Please log in again.');
            // Optionally: redirect to login
          }
        }
      } catch (error) {
        console.error('Error fetching user email:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchUser(); // Invoke the async function
  }, []);

  return (
    <div className="space-y-8">
      {/* Buy Form */}
      <div className="space-y-3 bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-xl font-semibold">Buy Waste</h2>
        <Input
        placeholder="Your Location"
        value={form.location}
        onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
        />
       <Input
        type="number"
        placeholder="Max Distance (km)"
        value={form.maxDistanceKm}
        onChange={(e) =>
            setForm((prev) => ({
            ...prev,
            maxDistanceKm: Number(e.target.value),
            }))
        }
        />
        <Input
        placeholder="Your Phone Number"
        value={form.phone}
        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
        />
       <Input
        placeholder="Preferred Waste Type"
        value={form.preferredWasteType}
        onChange={(e) =>
            setForm((prev) => ({ ...prev, preferredWasteType: e.target.value }))
        }
        />     
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
              <th className="p-3">ID</th>
              <th className="p-3">Max Distance(Km)</th>
              <th className="p-3">Preferred Waste Type</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-t">
                <td className="p-3 text-center">{tx.id}</td>
                <td className="p-3 text-center">{tx.maxDistanceKm}</td>
                <td className="p-3 text-center">{tx.preferredWasteType}</td>

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
                    onClick={() => toggleStatus(tx.id,tx.status)}
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
