'use client'

import type { DestinationPackage, BlogPost, Lead } from './types'

interface DashboardSectionProps {
    packages: DestinationPackage[]
    blogs: BlogPost[]
    leads: Lead[]
    users: Array<{ id?: string; email: string }>
    subscribers: Array<{ id?: string; email: string }>
    contactMessages: Array<{ id?: string; name: string }>
    testimonials: Array<{ id?: string; name: string }>
    destinations: Array<{ id?: string; name: string }>
    jobApplications: Array<{ id?: string; name: string }>
    handleNewPackage: () => void
    handleNewBlog: () => void
    handleEditPackage: (pkg: DestinationPackage) => void
    handleEditBlog: (blog: BlogPost) => void
    setActiveTab: (tab: string) => void
    setShowBulkImport: (show: boolean) => void
}

export default function DashboardSection({
    packages,
    blogs,
    leads,
    users,
    subscribers,
    contactMessages,
    testimonials,
    destinations,
    jobApplications,
    handleNewPackage,
    handleNewBlog,
    handleEditPackage,
    handleEditBlog,
    setActiveTab,
    setShowBulkImport,
}: DashboardSectionProps) {
    // Calculate stats
    const unreadLeads = leads.filter(l => !l.read).length
    const newLeadsToday = leads.filter(l => {
        const today = new Date()
        const leadDate = new Date(l.createdAt)
        return leadDate.toDateString() === today.toDateString()
    }).length

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Packages</p>
                            <p className="text-2xl font-bold text-gray-900">{packages.length}</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Leads</p>
                            <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
                            {unreadLeads > 0 && <p className="text-xs text-green-600">{unreadLeads} new</p>}
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Users</p>
                            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Subscribers</p>
                            <p className="text-2xl font-bold text-gray-900">{subscribers.length}</p>
                        </div>
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Blogs</p>
                            <p className="text-2xl font-bold text-gray-900">{blogs.length}</p>
                        </div>
                        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={handleNewPackage}
                        className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-semibold text-gray-700">New Package</span>
                    </button>
                    <button
                        onClick={handleNewBlog}
                        className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-semibold text-gray-700">New Blog Post</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('packages'); setShowBulkImport(true); }}
                        className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-600 hover:bg-green-50 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="font-semibold text-gray-700">Bulk Import</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('leads')}
                        className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-semibold text-gray-700">View Leads</span>
                    </button>
                </div>
            </div>

            {/* Recent Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Packages */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Recent Packages</h3>
                        <button onClick={() => setActiveTab('packages')} className="text-primary text-sm font-semibold hover:underline">View All</button>
                    </div>
                    <div className="space-y-3">
                        {packages.slice(0, 5).map((pkg) => (
                            <div key={pkg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-900">{pkg.Destination_Name}</p>
                                    <p className="text-sm text-gray-500">{pkg.Duration}</p>
                                </div>
                                <button onClick={() => handleEditPackage(pkg)} className="text-primary hover:text-primary-dark text-sm font-semibold">Edit</button>
                            </div>
                        ))}
                        {packages.length === 0 && <p className="text-gray-500 text-center py-4">No packages yet</p>}
                    </div>
                </div>

                {/* Recent Leads */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Recent Leads</h3>
                        <button onClick={() => setActiveTab('leads')} className="text-primary text-sm font-semibold hover:underline">View All</button>
                    </div>
                    <div className="space-y-3">
                        {leads.slice(0, 5).map((lead) => (
                            <div key={lead.id} className={`flex items-center justify-between p-3 rounded-lg ${!lead.read ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                <div>
                                    <p className="font-semibold text-gray-900">{lead.name}</p>
                                    <p className="text-sm text-gray-500">{lead.packageName || 'No package'} • {lead.mobile}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${lead.status === 'new' ? 'bg-green-100 text-green-800' :
                                        lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-800'
                                    }`}>{lead.status}</span>
                            </div>
                        ))}
                        {leads.length === 0 && <p className="text-gray-500 text-center py-4">No leads yet</p>}
                    </div>
                </div>
            </div>
        </div>
    )
}
