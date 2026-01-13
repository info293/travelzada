'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Header from '@/components/Header'
import JobForm from '@/components/admin/JobForm'
import { useAuth } from '@/contexts/AuthContext'

export default function EditJobPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const { isAdmin, permissions } = useAuth()
    const [job, setJob] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const hasAccess = isAdmin || (permissions && permissions.includes('jobs'))

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const docRef = doc(db, 'jobs', params.id)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    setJob({ id: docSnap.id, ...docSnap.data() })
                } else {
                    alert('Job not found')
                    router.push('/admin?tab=jobs')
                }
            } catch (error) {
                console.error('Error fetching job:', error)
            } finally {
                setLoading(false)
            }
        }

        if (hasAccess) {
            fetchJob()
        }
    }, [params.id, hasAccess, router])

    if (!hasAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-xl text-gray-600">You do not have permission to view this page.</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    const handleUpdateJob = async (data: any) => {
        try {
            await updateDoc(doc(db, 'jobs', params.id), {
                ...data,
                updatedAt: serverTimestamp(),
            })
            router.push('/admin?tab=jobs')
        } catch (error) {
            console.error('Error updating job:', error)
            alert('Failed to update job. Please try again.')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Job</h1>
                    <button
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    {job && (
                        <JobForm
                            job={job}
                            onSubmit={handleUpdateJob}
                            onCancel={() => router.back()}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
