import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { Search, Plus, FileText, CheckCircle, Clock, MoreVertical, Edit2, ChevronRight, LayoutDashboard, Settings, User, Trash2 } from 'lucide-react';
import printoLogo from '../assets/printo-logo.jpg';

const Dashboard = () => {
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data } = await API.get('/service-logs');
            setLogs(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching logs:", error);
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this service log?')) {
            try {
                await API.delete(`/service-logs/${id}`);
                setLogs(logs.filter(log => log._id !== id));
            } catch (error) {
                console.error("Error deleting log:", error);
                alert("Failed to delete log");
            }
        }
    };

    const filteredLogs = useMemo(() => logs.filter(log =>
        log.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.basicDetails?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.basicDetails?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.basicDetails?.productSerial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.engineerFeedback?.engineerName?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [logs, searchTerm]);

    const pendingCount = useMemo(() => logs.filter(l => l.engineerFeedback?.status === 'Pending').length, [logs]);
    const completedCount = useMemo(() => logs.filter(l => l.engineerFeedback?.status === 'Completed').length, [logs]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">

            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
                <div className="p-6 border-b border-slate-100 flex flex-col items-center gap-3">
                    <img src={printoLogo} alt="Logo" className="h-24 w-auto rounded-md" />
                    <span className="font-bold text-xl tracking-tight text-slate-800 text-center">Service Log Sheet</span>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-primary bg-primary/10 rounded-xl font-medium transition-colors">
                        <LayoutDashboard size={20} /> Dashboard
                    </a>
                </nav>
                <div className="p-4 border-t border-slate-100">
                    {/* User profile removed */}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Header (Mobile Logo + Search/Actions) */}
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
                    <div className="lg:hidden flex items-center gap-3">
                        <img src={printoLogo} alt="Logo" className="h-14 w-auto object-contain" />
                        <span className="font-bold text-sm tracking-tight text-slate-800">Service Log Sheet</span>
                    </div>

                    <div className="flex-1 max-w-xl px-4 hidden md:block">
                        <div className="relative group">
                            <input
                                type="text"
                                className="block w-full px-4 py-2.5 border-none rounded-xl bg-slate-100 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                placeholder="Search tickets, customers, serial numbers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link to="/create" className="hidden md:flex bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-primary/20 transition-all items-center gap-2 transform active:scale-95">
                            <Plus size={18} /> New Ticket
                        </Link>
                        <Link to="/create" className="md:hidden bg-primary text-white p-2 rounded-lg shadow-lg">
                            <Plus size={20} />
                        </Link>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">

                    {/* Welcome Section */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Card 1 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <span className="flex items-center text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                    +12%
                                </span>
                            </div>
                            <div className="text-3xl font-bold text-slate-800 mb-1">{logs.length}</div>
                            <div className="text-sm text-slate-500">Total Service Requests</div>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <Clock size={24} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-slate-800 mb-1">{pendingCount}</div>
                            <div className="text-sm text-slate-500">Pending Actions</div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                                    <CheckCircle size={24} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-slate-800 mb-1">{completedCount}</div>
                            <div className="text-sm text-slate-500">Jobs Completed</div>
                        </div>
                    </div>

                    {/* Mobile Search (visible only on mobile below header) */}
                    <div className="md:hidden mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                className="block w-full pl-4 pr-3 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Search tickets, customers, serials..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                            <h2 className="font-semibold text-slate-800">Recent Tickets</h2>
                            <button className="text-sm text-primary font-medium hover:text-primary/80">View All</button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="px-6 py-4 font-semibold">Ticket ID</th>
                                        <th className="px-6 py-4 font-semibold">Date</th>
                                        <th className="px-6 py-4 font-semibold">Customer</th>
                                        <th className="px-6 py-4 font-semibold">Product</th>
                                        <th className="px-6 py-4 font-semibold">Serial Number</th>
                                        <th className="px-6 py-4 font-semibold">Engineer</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="8" className="p-8 text-center text-slate-500">Loading...</td></tr>
                                    ) : filteredLogs.length === 0 ? (
                                        <tr><td colSpan="8" className="p-8 text-center text-slate-500">No logs found</td></tr>
                                    ) : (
                                        filteredLogs.map(log => (
                                            <tr key={log._id} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/edit/${log._id}`)}>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">
                                                        {log.ticketNumber}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500">
                                                    {new Date(log.requestDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                            {log.basicDetails?.customerName?.charAt(0) || 'C'}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700">{log.basicDetails?.customerName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    <div className="font-medium">{log.basicDetails?.productName}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    <div className="font-mono bg-slate-100 px-2 py-1 rounded text-xs inline-block">
                                                        {log.basicDetails?.productSerial || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                                    {log.engineerFeedback?.engineerName || 'Unassigned'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${log.engineerFeedback?.status === 'Completed'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${log.engineerFeedback?.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'
                                                            }`}></span>
                                                        {log.engineerFeedback?.status || 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={(e) => handleDelete(log._id, e)}
                                                            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            title="Delete Ticket"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                        <Link
                                                            to={`/edit/${log._id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                            title="View Details"
                                                        >
                                                            <ChevronRight size={18} />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
