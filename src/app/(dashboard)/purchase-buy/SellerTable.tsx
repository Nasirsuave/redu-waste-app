
'use client';

import { useEffect, useState } from 'react';
import { updateSellerStatus,getSellersByUser } from "../../../../utils/db/action";
import { Loader2, BadgeCheck, Hourglass } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SellerTable({ userId }: { userId: number }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

 
 const fetchSellers = async () => {
    setLoading(true);
    try {
      const data = await getSellersByUser(userId); // ✅ Using direct DB call
      setEntries(data);
    } catch (err) {
      console.error('Failed to load seller data', err);
      toast.error('Failed to load seller listings');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'searching' ? 'sold' : 'searching';
    try {
      await updateSellerStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      fetchSellers(); // Refresh list
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  useEffect(() => {
    fetchSellers()
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg mt-6">
      <h2 className="text-xl font-bold mb-4">My Waste Listings</h2>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin w-6 h-6 text-green-600" />
        </div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-green-700 bg-gray-100">
              <th className="py-2 px-4">ID</th>
              <th className="py-2 px-4">Waste Type</th>
              <th className="py-2 px-4">Created At</th>
              <th className="py-2 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-4">{entry.id}</td>
                <td className="py-2 px-4">{entry.wasteType}</td>
                <td className="py-2 px-4">{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => toggleStatus(entry.id, entry.status)}
                    className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 transition ${
                      entry.status === 'searching'
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {entry.status === 'searching' ? <Hourglass size={14} /> : <BadgeCheck size={14} />}
                    {entry.status}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
