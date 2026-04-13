import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, TrendingUp, Users, Heart, DollarSign, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ views: 0, followers: 0, likes: 0, earnings: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentContent, setRecentContent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      // Fetch user's posts
      const postsQ = query(collection(db, 'books_posts'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc'), limit(5));
      const postsSnap = await getDocs(postsQ);
      
      // Fetch user's stories
      const storiesQ = query(collection(db, 'stories'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc'), limit(5));
      const storiesSnap = await getDocs(storiesQ);

      let totalLikes = 0;
      let totalViews = 0; // Mocking views based on likes for now
      const content: any[] = [];

      postsSnap.forEach(doc => {
        const data = doc.data();
        totalLikes += (data.likes || []).length;
        totalViews += (data.likes || []).length * 10;
        content.push({ id: doc.id, type: 'post', ...data });
      });

      storiesSnap.forEach(doc => {
        const data = doc.data();
        totalLikes += (data.likes || []).length;
        totalViews += (data.likes || []).length * 15;
        content.push({ id: doc.id, type: 'story', ...data });
      });

      content.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setRecentContent(content.slice(0, 5));

      setStats({
        views: totalViews,
        followers: 45200, // Mock followers
        likes: totalLikes,
        earnings: totalViews * 0.01 // Mock earnings
      });

      // Mock chart data
      const data = [
        { name: 'Mon', views: Math.floor(Math.random() * 5000) },
        { name: 'Tue', views: Math.floor(Math.random() * 5000) },
        { name: 'Wed', views: Math.floor(Math.random() * 5000) },
        { name: 'Thu', views: Math.floor(Math.random() * 5000) },
        { name: 'Fri', views: Math.floor(Math.random() * 5000) },
        { name: 'Sat', views: Math.floor(Math.random() * 5000) },
        { name: 'Sun', views: Math.floor(Math.random() * 5000) },
      ];
      setChartData(data);
    };

    fetchDashboardData();
  }, [user]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white p-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Creator Studio Dashboard</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <span className="text-gray-500 font-medium">Total Views</span>
            </div>
            <div className="text-2xl font-black">{stats.views.toLocaleString()}</div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Users size={20} />
              </div>
              <span className="text-gray-500 font-medium">Followers</span>
            </div>
            <div className="text-2xl font-black">{stats.followers.toLocaleString()}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <Heart size={20} />
              </div>
              <span className="text-gray-500 font-medium">Total Likes</span>
            </div>
            <div className="text-2xl font-black">{stats.likes.toLocaleString()}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <DollarSign size={20} />
              </div>
              <span className="text-gray-500 font-medium">Earnings</span>
            </div>
            <div className="text-2xl font-black">${stats.earnings.toFixed(2)}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Performance Overview</h2>
            <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm font-medium outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>All Time</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Content Performance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">Recent Content</h2>
          <div className="space-y-4">
            {recentContent.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No content yet.</div>
            ) : (
              recentContent.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                    {item.mediaType === 'video' ? (
                      <video src={item.mediaUrl} className="w-full h-full object-cover" />
                    ) : (
                      <img src={item.mediaUrl || `https://picsum.photos/seed/${item.id}/100/100`} alt="Thumbnail" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm line-clamp-1">{item.title || item.description || 'Untitled'}</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-medium">
                      <span className="flex items-center gap-1"><TrendingUp size={12} /> {(item.likes?.length || 0) * 10} views</span>
                      <span className="flex items-center gap-1"><Heart size={12} /> {item.likes?.length || 0} likes</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600 font-bold text-sm">+${((item.likes?.length || 0) * 0.1).toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
