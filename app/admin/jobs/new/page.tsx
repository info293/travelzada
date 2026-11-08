'use client'

import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import JobForm from '@/components/admin/JobForm'
import { Card, PageHeader } from '@/components/admin/ui'

export default function NewJobPage() {
    const router = useRouter()

    const handleCreateJob = async (data: any) => {
        try {
            await addDoc(collection(db, 'jobs'), {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            })
            router.push('/admin/jobs')
        } catch (error) {
            console.error('Error creating job:', error)
            alert('Failed to create job. Please try again.')
        }
    }

    return (
        <div className="max-w-4xl">
            <PageHeader title="Post a new job" description="It appears on the public Careers page while its status is Active." />
            <Card>
                <JobForm onSubmit={handleCreateJob} onCancel={() => router.push('/admin/jobs')} />
            </Card>
        </div>
    )
}
