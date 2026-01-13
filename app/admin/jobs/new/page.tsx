'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Header from '@/components/Header'
import JobForm from '@/components/admin/JobForm'
import { useAuth } from '@/contexts/AuthContext'

export default function NewJobPage() {
    const router = useRouter()
    const { isAdmin, permissions } = useAuth()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const hasAccess = isAdmin || (permissions && permissions.includes('jobs'))

    if (!hasAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-xl text-gray-600">You do not have permission to view this page.</p>
            </div>
        )
    }

    const handleCreateJob = async (data: any) => {
        setIsSubmitting(true)
        try {
            await addDoc(collection(db, 'jobs'), {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })
            router.push('/admin?tab=jobs')
        } catch (error) {
            console.error('Error creating job:', error)
            alert('Failed to create job. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Post New Job</h1>
                    <button
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <JobForm
                        onSubmit={handleCreateJob}
                        onCancel={() => router.back()}
                    />
                </div>
            </div>
        </div>
    )
}
