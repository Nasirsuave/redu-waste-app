import { Card } from '@/components/ui/card';

export default function SellerList({ sellers }: { sellers: any[] }) {
  return (
    <div className="space-y-4">
      {sellers.map((seller, idx) => (
        <Card key={idx} className="p-4 shadow">
          <div className="font-semibold text-lg">{seller.name}</div>
          <div>📍 {seller.location}</div>
          <div>📞 {seller.phone}</div>
          <div>💰 {seller.price}</div>
          <div className="text-sm text-gray-500">Points: {seller.points}</div>
        </Card>
      ))}
    </div>
  );
}
