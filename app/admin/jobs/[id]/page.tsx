'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import JobForm from '@/components/admin/JobForm'
import { Button, Card, EmptyState, PageHeader, Spinner } from '@/components/admin/ui'

export default function EditJobPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [job, setJob] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'jobs', params.id))
                if (docSnap.exists()) setJob({ id: docSnap.id, ...docSnap.data() })
                else setNotFound(true)
            } catch (error) {
                console.error('Error fetching job:', error)
                setNotFound(true)
            } finally {
                setLoading(false)
            }
        }
        fetchJob()
    }, [params.id])

    const handleUpdateJob = async (data: any) => {
        try {
            await updateDoc(doc(db, 'jobs', params.id), {
                ...data,
                updatedAt: serverTimestamp(),
            })
            router.push('/admin/jobs')
        } catch (error) {
            console.error('Error updating job:', error)
            alert('Failed to update job. Please try again.')
        }
    }

    if (loading) return <Spinner label="Loading job…" />

    if (notFound || !job) {
        return (
            <Card>
                <EmptyState
                    title="Job not found"
                    description="It may have been deleted."
                    action={<Button variant="secondary" onClick={() => router.push('/admin/jobs')}>All job openings</Button>}
                />
            </Card>
        )
    }

    return (
        <div className="max-w-4xl">
            <PageHeader title="Edit job" description={job.title} />
            <Card>
                <JobForm job={job} onSubmit={handleUpdateJob} onCancel={() => router.push('/admin/jobs')} />
            </Card>
        </div>
    )
}
