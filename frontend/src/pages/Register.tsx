import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Project Manager');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (!res.ok) {
        let errorMsg = 'Registration failed';
        try {
            const d = await res.json();
            if (d.detail) errorMsg = d.detail;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#121419] rounded-xl border border-gray-800 p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] mb-4">
            <Layers className="text-[#0b0c10] w-7 h-7 font-bold" />
          </div>
          <h2 className="text-white text-2xl font-black tracking-wide">Create Account</h2>
          <p className="text-gray-500 text-sm mt-1">Join the BuildSim platform</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2">FULL NAME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1a1d24] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2">EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1a1d24] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1d24] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2">CONFIRM PASSWORD</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#1a1d24] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2">ROLE</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#1a1d24] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="Project Manager">Project Manager</option>
              <option value="Construction Planner">Construction Planner</option>
              <option value="Architect">Architect</option>
              <option value="Civil Engineer">Civil Engineer</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all mt-6"
          >
            REGISTER
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account? <Link to="/login" className="text-emerald-500 hover:text-emerald-400 font-bold">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
