'use client'

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {  getUserByEmail,UploadForSale,updateSellerStatus } from "../../../../utils/db/action"
import { toast } from 'react-hot-toast';
import { Loader, CheckCircle2,Loader2 } from 'lucide-react';
import SellerTable from './SellerTable';


export default function SellerForm() {
  const [form, setForm] = useState({
    wasteType: '',
    quantity: '',
    location: '',
    phone: '',
    email: '',
  });

 const [loading, setLoading] = useState(true)
 const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };


   const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'searching' ? 'sold' : 'searching';
    try {
      await updateSellerStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      //fetchSellers(); // Refresh list
    } catch (err) {
      toast.error('Failed to update status');
    }
  };


 const handleSubmit = async () => {
  if (!user) {
    toast.error('User not loaded. Please log in again.');
    return;
  }

  const { wasteType, quantity, location, phone, email } = form;

  if (!wasteType || !quantity || !location || !phone || !email) {
    toast.error('Please fill in all fields.');
    return;
  }

  try {
    setLoading(true);
    const newEntry = await UploadForSale(
      user.id,
      wasteType,
      'seller',       // role is always 'seller' here
      quantity,       // assuming quantity is stored in 'price' in schema, update schema or name if needed
      phone,
      location,
      email
    );
    toast.success('Sale listing submitted successfully!');
    console.log('Uploaded:', newEntry);

    // Optionally clear form
    setForm({
      wasteType: '',
      quantity: '',
      location: '',
      phone: '',
      email: user.email || '',
    });
  } catch (error) {
    console.error('Error submitting sale:', error);
    toast.error('Something went wrong while submitting.');
  } finally {
    setLoading(false);
  }
};


 useEffect(() => {
  const fetchUser = async () => {
    try {
      setLoading(true);
      const userEmail = localStorage.getItem('userEmail');
      console.log('User email from localStorage:', userEmail);

      if (userEmail) {
        setForm((prev) => ({ ...prev, email: userEmail }));
        const fetchedUser = await getUserByEmail(userEmail);
        console.log('Returning the user by email:', fetchedUser);

        if (fetchedUser) {
          setUser(fetchedUser);
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
    <>
    <div className="space-y-4 bg-white rounded-2xl p-6 shadow-md">
      <h2 className="text-xl font-semibold">Sell Waste</h2>
      <Input placeholder="Waste Type" name="wasteType" onChange={handleChange} />
      <Input placeholder="Quantity (kg)" name="quantity" onChange={handleChange} />
      <Input placeholder="Location" name="location" onChange={handleChange} />
      <Input placeholder="Phone Number" name="phone" onChange={handleChange} />
      <Input placeholder="Email" name="email" value={form.email} onChange={handleChange} />

      <Button onClick={handleSubmit} className="w-full mt-4  bg-green-600 hover:bg-green-700 text-white py-3 text-lg rounded-xl transition-colors duration-300 flex items-center justify-center">Submit</Button>
    </div>
   
   {user && <SellerTable userId={user.id} />}

    </>
  );
}
