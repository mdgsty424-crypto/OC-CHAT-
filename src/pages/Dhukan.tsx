import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, ShoppingCart, Search, MessageCircle, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dhukan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'dhukan_products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(fetchedProducts);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white p-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold flex-1">Dhukan Marketplace</h1>
        <button className="p-2 hover:bg-gray-100 rounded-full relative">
          <ShoppingCart size={24} />
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">0</span>
        </button>
      </div>

      <div className="p-4 bg-white border-b border-gray-100 sticky top-[72px] z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search products, sellers..." 
            className="w-full bg-gray-100 border-none rounded-xl py-3 pl-10 pr-4 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {products.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 flex flex-col items-center">
            <ShoppingCart size={64} className="text-gray-300 mb-4" />
            <p className="font-medium">No products available yet.</p>
            <p className="text-sm mt-2">Become a seller in your profile to add products!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="aspect-square bg-gray-100 relative">
                  <img src={product.images?.[0] || `https://picsum.photos/seed/${product.id}/200/200`} alt={product.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                    <Star size={12} className="fill-yellow-400 text-yellow-400" /> 4.8
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-sm line-clamp-2 mb-1">{product.name}</h3>
                  <p className="text-blue-600 font-black text-lg mb-2">৳{product.price}</p>
                  <div className="mt-auto flex gap-2">
                    <button className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors">
                      Buy Now
                    </button>
                    <button 
                      onClick={() => navigate(`/chat/${product.sellerId}`)}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <MessageCircle size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
