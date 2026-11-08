'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { Briefcase, Mail, Phone, Linkedin, Plus, RefreshCw } from 'lucide-react'
import { db } from '@/lib/firebase'
import {
    Badge, Button, Card, Drawer, EmptyState, FilterChips, PageHeader, SearchInput, Spinner, StatCard, StatRow,
    Table, Td, Th, Toolbar, formatDate,
} from '@/components/admin/ui'

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

type SortKey = 'title' | 'department' | 'location' | 'status' | 'createdAt'

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [filterText, setFilterText] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all')
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' })
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const jobsSnapshot = await getDocs(query(collection(db, 'jobs'), orderBy('createdAt', 'desc')))
            setJobs(jobsSnapshot.docs.map((d) => {
                const data = d.data()
                return {
                    id: d.id,
                    title: data.title || '',
                    department: data.department || '',
                    location: data.location || '',
                    type: data.type || '',
                    description: data.description || '',
                    status: data.status,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
                }
            }))

            let appsSnapshot
            try {
                appsSnapshot = await getDocs(query(collection(db, 'job_applications'), orderBy('createdAt', 'desc')))
            } catch {
                appsSnapshot = await getDocs(collection(db, 'job_applications'))
            }
            setApplications(appsSnapshot.docs.map((d) => {
                const data = d.data()
                return {
                    id: d.id,
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    linkedin: data.linkedin || '',
                    position: data.position || '',
                    coverLetter: data.coverLetter || '',
                    status: data.status || 'new',
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
                }
            }))
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    const handleDeleteJob = async (id: string) => {
        if (!window.confirm('Delete this job opening? Applications already received are kept.')) return
        try {
            await deleteDoc(doc(db, 'jobs', id))
            fetchData()
        } catch (error) {
            console.error('Error deleting job:', error)
            alert('Error deleting job. Please try again.')
        }
    }

    const handleSort = (key: SortKey) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }))
    }

    const applicantsFor = (jobTitle: string) => applications.filter((app) => app.position === jobTitle)

    const visibleJobs = useMemo(() => {
        const q = filterText.trim().toLowerCase()
        return jobs
            .filter((job) => statusFilter === 'all' || job.status === statusFilter)
            .filter((job) => !q || `${job.title} ${job.department} ${job.location}`.toLowerCase().includes(q))
            .sort((a, b) => {
                const av = String(a[sortConfig.key] ?? '')
                const bv = String(b[sortConfig.key] ?? '')
                if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
                if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
    }, [jobs, filterText, statusFilter, sortConfig])

    const arrow = (key: SortKey) => (sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓') : '')

    const selectedJob = jobs.find((j) => j.id === selectedJobId)
    const selectedApplicants = selectedJob ? applicantsFor(selectedJob.title) : []
    const activeCount = jobs.filter((j) => j.status === 'active').length

    return (
        <div>
            <PageHeader
                title="Job Openings"
                description="Open positions shown on the public Careers page."
                actions={
                    <>
                        <Button variant="secondary" onClick={fetchData}><RefreshCw className="w-4 h-4" /> Refresh</Button>
                        <Link href="/admin/jobs/new" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-bordeaux-600 text-white hover:bg-bordeaux-700 shadow-sm">
                            <Plus className="w-4 h-4" /> Post new job
                        </Link>
                    </>
                }
            />

            <StatRow>
                <StatCard label="All openings" value={jobs.length} icon={<Briefcase className="w-5 h-5" />} />
                <StatCard label="Active" value={activeCount} tone="green" />
                <StatCard label="Closed" value={jobs.length - activeCount} tone="gray" />
                <StatCard label="Applications" value={applications.length} tone="blue" hint={<Link href="/admin/careers" className="text-bordeaux-600 hover:underline">Review applications</Link>} />
            </StatRow>

            <Card padded={false}>
                <div className="p-4 border-b border-gray-100">
                    <Toolbar>
                        <FilterChips
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: 'all', label: 'All', count: jobs.length },
                                { value: 'active', label: 'Active', count: activeCount },
                                { value: 'closed', label: 'Closed', count: jobs.length - activeCount },
                            ]}
                        />
                        <SearchInput value={filterText} onChange={setFilterText} placeholder="Search title, department, location…" className="md:w-72" />
                    </Toolbar>
                </div>

                {loading ? <Spinner label="Loading jobs…" /> : visibleJobs.length === 0 ? (
                    <EmptyState
                        icon={<Briefcase className="w-5 h-5" />}
                        title={jobs.length === 0 ? 'No jobs posted yet' : 'No jobs match your filters'}
                        action={jobs.length === 0 ? <Link href="/admin/jobs/new" className="text-sm font-semibold text-bordeaux-600 hover:underline">Post the first job</Link> : undefined}
                    />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th onClick={() => handleSort('title')}>Job title{arrow('title')}</Th>
                                <Th onClick={() => handleSort('department')}>Department{arrow('department')}</Th>
                                <Th onClick={() => handleSort('location')}>Location{arrow('location')}</Th>
                                <Th>Applicants</Th>
                                <Th onClick={() => handleSort('status')}>Status{arrow('status')}</Th>
                                <Th onClick={() => handleSort('createdAt')}>Posted{arrow('createdAt')}</Th>
                                <Th className="text-right">Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleJobs.map((job) => {
                                const count = applicantsFor(job.title).length
                                return (
                                    <tr key={job.id} className="hover:bg-gray-50">
                                        <Td>
                                            <div className="font-semibold text-gray-900">{job.title}</div>
                                            <div className="text-xs text-gray-500">{job.type}</div>
                                        </Td>
                                        <Td>{job.department}</Td>
                                        <Td>{job.location}</Td>
                                        <Td>
                                            <button type="button" onClick={() => setSelectedJobId(job.id)} disabled={!count}>
                                                <Badge tone={count ? 'blue' : 'gray'}>{count} applicant{count === 1 ? '' : 's'}</Badge>
                                            </button>
                                        </Td>
                                        <Td><Badge tone={job.status === 'active' ? 'green' : 'gray'}>{job.status === 'active' ? 'Active' : 'Closed'}</Badge></Td>
                                        <Td className="whitespace-nowrap text-gray-500">{formatDate(job.createdAt)}</Td>
                                        <Td className="text-right whitespace-nowrap">
                                            <Link href={`/admin/jobs/${job.id}`} className="text-sm font-semibold text-bordeaux-600 hover:underline">Edit</Link>
                                            <button type="button" onClick={() => handleDeleteJob(job.id)} className="ml-4 text-sm font-semibold text-red-600 hover:underline">Delete</button>
                                        </Td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </Table>
                )}
            </Card>

            <Drawer
                open={!!selectedJob}
                onClose={() => setSelectedJobId(null)}
                title={selectedJob ? `Applicants · ${selectedJob.title}` : ''}
                width="max-w-2xl"
                footer={<Link href="/admin/careers" className="text-sm font-semibold text-bordeaux-600 hover:underline">Manage all applications →</Link>}
            >
                {selectedApplicants.length === 0 ? (
                    <EmptyState title="No applicants yet for this position." />
                ) : (
                    <div className="space-y-4">
                        {selectedApplicants.map((app) => (
                            <div key={app.id} className="border border-gray-200 rounded-xl p-4">
                                <div className="flex flex-wrap justify-between gap-2">
                                    <p className="font-semibold text-gray-900">{app.name}</p>
                                    <span className="text-xs text-gray-500">Applied {formatDate(app.createdAt)}</span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                                    <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1 hover:text-bordeaux-600"><Mail className="w-3.5 h-3.5" />{app.email}</a>
                                    {app.phone && <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1 hover:text-bordeaux-600"><Phone className="w-3.5 h-3.5" />{app.phone}</a>}
                                    {app.linkedin && <a href={app.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-bordeaux-600 hover:underline"><Linkedin className="w-3.5 h-3.5" />LinkedIn</a>}
                                </div>
                                <p className="mt-3 bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line">{app.coverLetter || 'No cover letter provided.'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Drawer>
        </div>
    )
}
