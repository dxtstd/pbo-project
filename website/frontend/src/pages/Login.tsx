import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoginFormData } from '../types';
import { API_URL } from '../config';

export const Login: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json() as { token?: string; user?: { id: string; role: 'owner' | 'customer' | 'admin' }; message?: string };
      if (!response.ok || !result.token || !result.user) {
        setError(result.message || 'Akun atau password salah.');
        return;
      }
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('userId', result.user.id);
      localStorage.setItem('userRole', result.user.role);
      navigate(result.user.role === 'owner' ? '/dashboard/owner' : result.user.role === 'customer' ? '/dashboard/customer' : '/');
    } catch {
      setError('Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-76px)] items-center justify-center gap-12 bg-[#F5EBE6] px-4 py-8 sm:px-8 md:min-h-[calc(100dvh-88px)] md:px-12 md:py-12 lg:justify-around lg:px-16">
      <div className="w-full max-w-md rounded-xl bg-white/60 p-5 shadow-md sm:p-8">
        <h2 className="text-2xl font-serif font-bold text-[#4A3B32] mb-6">Welcome</h2>
        <form onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-xs text-[#6B5B52] mb-1">Username</label>
            <input 
              type="text" 
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-[#D3C5B4] rounded bg-white text-sm focus:outline-none focus:border-[#5C4033]"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-[#6B5B52] mb-1">Password</label>
            <input 
              type="password" 
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-[#D3C5B4] rounded bg-white text-sm focus:outline-none focus:border-[#5C4033]"
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-[#5C4033] text-white py-2 rounded font-medium hover:bg-[#4A3B32] transition mt-2"
          >
            {isSubmitting ? 'Memeriksa...' : 'Login'}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
      </div>
      
      <div className="hidden w-full max-w-xl lg:block">
        <img src="/img/kost.png" alt="Kost" className="aspect-[16/10] w-full rounded-lg object-cover" />
      </div>
    </div>
  );
};