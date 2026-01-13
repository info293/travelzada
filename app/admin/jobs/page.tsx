'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

interface Job {
    id: string
    title: string
    department: string
    location: string
    type: string
    description: string
    status: 'active' | 'closed'
    createdAt: any
}

interface Application {
    id: string
    name: string
    email: string
    phone: string
    linkedin: string
    position: string
    coverLetter: string
    status: string
    createdAt: any
}

export default function JobsPage() {
    const router = useRouter()
    const { isAdmin, permissions, loading: authLoading } = useAuth()
    const [jobs, setJobs] = useState<Job[]>([])
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [filterText, setFilterText] = useState('')
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' })

    // Modal state
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
    const [showApplicantsModal, setShowApplicantsModal] = useState(false)

    useEffect(() => {
        if (!authLoading) {
            const hasAccess = isAdmin || (permissions && permissions.includes('jobs'))
            if (!hasAccess) {
                router.push('/admin')
            } else {
                fetchData()
            }
        }
    }, [authLoading, isAdmin, permissions, router])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch Jobs
            const jobsQuery = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'))
            const jobsSnapshot = await getDocs(jobsQuery)
            const jobsData: Job[] = []
            jobsSnapshot.forEach((doc) => {
                const data = doc.data()
                jobsData.push({
                    id: doc.id,
                    title: data.title,
                    department: data.department,
                    location: data.location,
                    type: data.type,
                    description: data.description,
                    status: data.status,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
                })
            })
            setJobs(jobsData)

            // Fetch Applications
            const appsQuery = query(collection(db, 'job_applications'), orderBy('createdAt', 'desc'))
            const appsSnapshot = await getDocs(appsQuery)
            const appsData: Application[] = []
            appsSnapshot.forEach((doc) => {
                const data = doc.data()
                appsData.push({
                    id: doc.id,
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    linkedin: data.linkedin || '',
                    position: data.position || '',
                    coverLetter: data.coverLetter || '',
                    status: data.status || 'new',
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
                })
            })
            setApplications(appsData)

        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteJob = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this job?')) return
        try {
            await deleteDoc(doc(db, 'jobs', id))
            fetchData() // Refresh list
        } catch (error) {
            console.error('Error deleting job:', error)
            alert('Error deleting job. Please try again.')
        }
    }

    const handleSort = (key: string) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }))
    }

    // Get applicants for a specific job
    const getJobApplicants = (jobTitle: string) => {
        return applications.filter(app => app.position === jobTitle)
    }

    const sortedAndFilteredJobs = jobs
        .filter((job) => {
            if (!filterText) return true
            const searchText = filterText.toLowerCase()
            return (
                job.title.toLowerCase().includes(searchText) ||
                job.department.toLowerCase().includes(searchText) ||
                job.location.toLowerCase().includes(searchText)
            )
        })
        .sort((a: any, b: any) => {
            const aValue = a[sortConfig.key]
            const bValue = b[sortConfig.key]
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <span className="inline-block w-4" />
        return (
            <span className="inline-block ml-1">
                {sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
        )
    }

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    const selectedJob = jobs.find(j => j.id === selectedJobId)
    const selectedApplicants = selectedJob ? getJobApplicants(selectedJob.title) : []

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/admin" className="text-gray-500 hover:text-gray-900 text-sm font-medium">
                                ← Back to Dashboard
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Manage Jobs</h1>
                        <p className="text-gray-600">View, create, and manage job listings.</p>
                    </div>
                    <Link
                        href="/admin/jobs/new"
                        className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition-colors shadow-sm"
                    >
                        + Post New Job
                    </Link>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-gray-900">All Jobs ({jobs.length})</h2>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search jobs..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                                />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('title')}
                                    >
                                        Job Title <SortIcon column="title" />
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('department')}
                                    >
                                        Department <SortIcon column="department" />
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('location')}
                                    >
                                        Location <SortIcon column="location" />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Applicants
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('status')}
                                    >
                                        Status <SortIcon column="status" />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sortedAndFilteredJobs.map((job) => {
                                    const applicantCount = getJobApplicants(job.title).length
                                    return (
                                        <tr key={job.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{job.title}</div>
                                                <div className="text-xs text-gray-500">{job.type}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">{job.department}</td>
                                            <td className="px-6 py-4 text-gray-700">{job.location}</td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => {
                                                        setSelectedJobId(job.id)
                                                        setShowApplicantsModal(true)
                                                    }}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${applicantCount > 0
                                                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                            : 'bg-gray-100 text-gray-500'
                                                        }`}
                                                >
                                                    {applicantCount} Applicants
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {job.status === 'active' ? 'Active' : 'Closed'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/admin/jobs/${job.id}`}
                                                        className="text-primary hover:text-primary-dark text-sm font-semibold"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteJob(job.id)}
                                                        className="text-red-600 hover:text-red-800 text-sm font-semibold ml-3"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {jobs.length === 0 && (
                            <div className="text-center py-12 text-gray-500">No jobs posted yet</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Applicants Modal */}
            {showApplicantsModal && selectedJob && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Applicants</h2>
                                <p className="text-gray-600">For {selectedJob.title}</p>
                            </div>
                            <button
                                onClick={() => setShowApplicantsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {selectedApplicants.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <p className="text-lg">No applicants yet for this position.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {selectedApplicants.map((app) => (
                                        <div key={app.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">{app.name}</h3>
                                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            📧 <a href={`mailto:${app.email}`} className="hover:text-primary">{app.email}</a>
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            📱 <a href={`tel:${app.phone}`} className="hover:text-primary">{app.phone}</a>
                                                        </span>
                                                        {app.linkedin && (
                                                            <span className="flex items-center gap-1">
                                                                🔗 <a href={app.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn Profile</a>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-500 whitespace-nowrap">
                                                    Applied: {new Date(app.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Cover Letter</h4>
                                                <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">
                                                    {app.coverLetter || 'No cover letter provided.'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
                            <button
                                onClick={() => setShowApplicantsModal(false)}
                                className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
