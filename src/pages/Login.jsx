import { useState, useContext } from 'react';
import API from '../utils/api';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data } = await API.post('/auth/login', { email, password });
            login(data);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
                <h2 className="mb-6 text-2xl font-bold text-center">Printocards Login</h2>
                {error && <p className="mb-4 text-red-500 text-center">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block mb-1 text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full px-4 py-2 font-bold text-white bg-primary rounded hover:bg-primary/90"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
