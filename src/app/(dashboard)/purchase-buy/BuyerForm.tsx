


'use client'

import { useState,useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SellerList from './SellerList';
import { StandaloneSearchBox, useJsApiLoader } from '@react-google-maps/api'
import { Libraries } from "@react-google-maps/api"
import { getUserByEmail,UploadForBuy,getBuyersByUser,updateBuyerStatus,getTotalTransactionAmount,getSellersByWasteType,matchWithGemini } from '../../../../utils/db/action';
import { Loader, CheckCircle2, SearchCheck,Phone, Mail,ChevronDown,Info,MapPin,CircleCheck,Ruler } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';


const googleApikey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string

const libraries: Libraries = ['places']



type Transaction = {
  id: number;
  preferredWasteType: string;
  maxDistanceKm: number;
  status: 'searching' | 'bought';
};



export default function BuyerForm() {
const [loading, setLoading] = useState(true)
const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
const [geminiResults, setGeminiResults] = useState<any[]>([]);
const [isModalOpen, setIsModalOpen] = useState(false);
const [isGeminiLoading, setIsGeminiLoading] = useState(false);



const [form, setForm] = useState({
  location: '',
  exactLocation: '', // New field for exact location
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
        const { location, phone, preferredWasteType, maxDistanceKm,exactLocation } = form;

        if (!preferredWasteType || !phone || !location || !maxDistanceKm || !exactLocation) {
            toast.error('Please fill in all fields.');
            return;
        }
        setIsModalOpen(true);
        setIsGeminiLoading(true);

        const newBuyer = await UploadForBuy(
        user.id, // Assuming you're passing userId from userInfo
        preferredWasteType,
        "buyer",
        phone,
        maxDistanceKm,
        location,
        exactLocation
    );

    const updatedBuyers = await getBuyersByUser(user.id);
    setTransactions(updatedBuyers);

    //working on it 
      console.log("Value of preferredWasteType:", preferredWasteType);
     const matchingSellers = await getSellersByWasteType(preferredWasteType);
     console.log("Matching Sellers:", matchingSellers);
     
     console.log("Before Seller Data For Gemini")
    // const sellerDataForGemini = await Promise.all(
    //   matchingSellers
    //   .filter((seller) => seller.userId !== user.id) //  Exclude the buyer
    //   .map(async (seller) => ({
    //     sellerId: seller.id,
    //     location: seller.location,
    //     points: (await getTotalTransactionAmount(seller.userId) as { total: number }).total  //This tells TypeScript: “Trust me — this will return a { total: number } object.”
    //   }))
    // );

    const sellerDataForGemini = await Promise.all(
  matchingSellers
    .filter((seller) => seller.userId !== user.id) // Exclude the buyer
    .map(async (seller) => {
      const result = await getTotalTransactionAmount(seller.userId);
      console.log(`👉 Seller ID: ${seller.userId}, Reward Points Result:`, result);

      return {
        userId: seller.userId,
        sellerId: seller.id,
        location: seller.location,
        exactLocation: seller.exactLocation, // Include exact location
        points: result?.total ?? 0, // fallback to 0 if undefined
        email: seller.email ?? undefined,
        phone: seller.phone ?? undefined,
        status: seller.status ?? undefined,
      };
    })
);


    console.log("After Seller Data For Gemini");

  
   
  

      console.log("Before Match With Gemini")
      const geminiResult = await matchWithGemini({
      buyerLocation: location,
      exactLocation, // Pass exact location
      maxDistanceKm,
      sellerList: sellerDataForGemini,
    });
    console.log("Before Match With Gemini")
    

    console.log("Before overall result")
    const topSeller = geminiResult 
    console.log('Top Seller:', topSeller);

    console.log("After overall result")

    setGeminiResults(geminiResult);
    setIsGeminiLoading(false);

        toast.success('Buyer info uploaded successfully');

        //de-populate the input field of the buyer

        }catch(error){
            console.error('Error finding sellers:', error);
            toast.error('Failed to find sellers');
            setIsGeminiLoading(false);
            setIsModalOpen(false);
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


  //exact location
  const fetchExactLocation = async (setForm: any, toast: any) => {
  if (!navigator.geolocation) {
    toast.error('Geolocation is not supported by your browser');
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;

    try {
      const geocoder = new window.google.maps.Geocoder();
      const latLng = { lat: latitude, lng: longitude };

      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const fullAddress = results[0].formatted_address;
          const finalLocation = `${fullAddress} (Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)})`;
          setForm((prev: any) => ({
            ...prev,
            exactLocation: finalLocation,
          }));
        } else {
          toast.error('Unable to fetch address from coordinates');
        }
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Error fetching location');
    }
  }, () => {
    toast.error('Unable to retrieve your location');
  });
};

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

    useEffect(() => {
  
    fetchExactLocation(setForm,toast);
  
}, []);

  return (
    <div className="space-y-8">
      {/* Buy Form */}
      <div className="space-y-3 bg-white p-4 sm:p-6 rounded-2xl shadow-md">
        <h2 className="text-xl font-semibold">Buy Waste</h2>
        <Input
        placeholder="Your Location"
        value={form.location}
        onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
        />
        <Input
        value={form.exactLocation}
        readOnly
        />
        
       <Input
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
      <div className="bg-white rounded-2xl shadow-md p-6 relative">
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


      {/* adding modal */}
        <Transition show={isModalOpen} as={Fragment}>
  <Dialog onClose={() => setIsModalOpen(false)} className="fixed z-50 inset-0 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen p-4">

      <Transition.Child
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >

        <Dialog.Panel
  className="sticky top-[2rem] bg-white rounded-2xl p-4 sm:p-6 m-[5rem] w-full sm:max-w-3xl ml-[14rem] h-[30rem] shadow-xl transform transition-all z-50"
>
  <Dialog.Title className="text-xl font-semibold mb-4">Matched Sellers</Dialog.Title>

  {isGeminiLoading ? (
    <div className="flex items-center justify-center space-x-2 text-green-600">
      <Loader className="animate-spin" size={24} />
      <span>Finding Sellers closer to you...</span>
    </div>
  ) : (
    <div className='overflow-x-auto'>
    <table className="w-full min-w-[600px] text-sm border">
      {/* <thead>
        <tr>
          <th className="p-4 bg-gray-100 text-gray-700" colSpan={5}>
            <div className="flex items-center justify-between gap-6 text-sm font-semibold uppercase">
              <div className="flex items-center gap-2">
                <MapPin className="text-blue-500 w-4 h-4" />
                <span>Location</span>
              </div>
              <div className="flex items-center gap-2">
                <Ruler className="text-purple-500 w-4 h-4" />
                <span>Distance</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="text-green-500 w-4 h-4" />
                <span>Email</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="text-emerald-500 w-4 h-4" />
                <span>Call</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="text-orange-500 w-4 h-4" />
                <span>Status</span>
              </div>
            </div>
          </th>
        </tr>
      </thead> */}

      <thead>
  <tr className="bg-gray-100 text-gray-700 text-sm font-semibold uppercase">
    <th className="p-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <MapPin className="text-blue-500 w-4 h-4" />
        <span>Location</span>
      </div>
    </th>
    <th className="p-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <Ruler className="text-purple-500 w-4 h-4" />
        <span>Distance(Km)</span>
      </div>
    </th>
    <th className="p-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <Mail className="text-green-500 w-4 h-4" />
        <span>Email</span>
      </div>
    </th>
    <th className="p-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <Phone className="text-emerald-500 w-4 h-4" />
        <span>Call</span>
      </div>
    </th>
    <th className="p-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <Info className="text-orange-500 w-4 h-4" />
        <span>Status</span>
      </div>
    </th>
  </tr>
</thead>

      <tbody>
        {geminiResults.map((s, i) => (
          <tr key={i} className="border-t text-center">
            <td className="p-3 w-10 text-center">{s.location}</td>
            <td className="p-3 w-10 text-center">{s.distanceKm}</td>
            <td className="p-3 w-10 text-center">{s.email}</td>
            <td className="p-3 w-10 text-center">{s.phone}</td>
            <td className="p-3 w-10 text-center">{s.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
   </div>
  )}
</Dialog.Panel>

      </Transition.Child>
    </div>
  </Dialog>
</Transition>

    </div>
  );
}





