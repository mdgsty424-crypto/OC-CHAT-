import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Plus, Package, Truck, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Product Form State
  const [step, setStep] = useState(1);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    file: null as File | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'dhukan_products'), where('sellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'dhukan_orders'), where('sellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddProduct = async () => {
    if (!user || !productForm.file) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', productForm.file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        await addDoc(collection(db, 'dhukan_products'), {
          name: productForm.name,
          price: productForm.price,
          description: productForm.description,
          category: productForm.category,
          images: [data.url], // Storing as array for future multi-image support
          sellerId: user.uid,
          createdAt: serverTimestamp()
        });
        setIsUploading(false);
        setStep(1);
        setProductForm({ name: '', price: '', description: '', category: '', file: null });
        alert('Product added successfully!');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white p-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold flex-1">Seller Dashboard</h1>
        <button onClick={() => setIsUploading(true)} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200">
          <Plus size={24} />
        </button>
      </div>

      <div className="flex bg-white border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-4 font-bold text-sm ${activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
        >
          My Products
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-4 font-bold text-sm ${activeTab === 'orders' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
        >
          Orders
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'products' ? (
          <div className="grid grid-cols-2 gap-4">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <img src={product.images?.[0] || `https://picsum.photos/seed/${product.id}/200/200`} alt={product.name} className="w-full aspect-square object-cover" />
                <div className="p-3">
                  <h3 className="font-bold text-sm line-clamp-1">{product.name}</h3>
                  <p className="text-blue-600 font-black">৳{product.price}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">No orders yet.</div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm">Order #{order.id.slice(0, 8)}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status || 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{order.productName}</p>
                  <p className="text-sm font-bold mt-2">Total: ৳{order.total}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Upload Product Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Add New Product (Step {step}/2)</h2>
            
            {step === 1 ? (
              <div className="space-y-4">
                <input type="text" placeholder="Product Name" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none" />
                <input type="number" placeholder="Price (BDT)" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none" />
                <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none">
                  <option value="">Select Category</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="home">Home & Garden</option>
                </select>
                <textarea placeholder="Description" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none h-24 resize-none" />
                <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Next Step</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {productForm.file ? (
                    <span className="font-medium text-blue-600">{productForm.file.name}</span>
                  ) : (
                    <>
                      <Plus size={32} className="mb-2" />
                      <span>Upload Product Image</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={e => setProductForm({...productForm, file: e.target.files?.[0] || null})} 
                  className="hidden" 
                  accept="image/*"
                />
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Back</button>
                  <button 
                    onClick={handleAddProduct} 
                    disabled={isSubmitting || !productForm.file}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Publish Product'}
                  </button>
                </div>
              </div>
            )}
            <button onClick={() => setIsUploading(false)} className="mt-4 w-full py-2 text-gray-500 font-bold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
