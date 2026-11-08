'use client'

import { useState, useEffect } from 'react'
import { Button, Field, inputClass } from './ui'

interface Job {
    id?: string
    title: string
    department: string
    location: string
    type: string
    description: string
    status: 'active' | 'closed'
}

interface JobFormProps {
    job?: Job | null
    onSubmit: (data: Omit<Job, 'id'>) => Promise<void>
    onCancel: () => void
}

export default function JobForm({ job, onSubmit, onCancel }: JobFormProps) {
    const [formData, setFormData] = useState<Omit<Job, 'id'>>({
        title: '',
        department: '',
        location: '',
        type: 'Full-time',
        description: '',
        status: 'active',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (job) {
            setFormData({
                title: job.title,
                department: job.department,
                location: job.location,
                type: job.type,
                description: job.description,
                status: job.status,
            })
        }
    }, [job])

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await onSubmit(formData)
        } catch (error) {
            console.error('Error submitting job:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Job title">
                    <input type="text" name="title" required value={formData.title} onChange={handleChange} className={inputClass} placeholder="e.g. Senior Travel Planner" />
                </Field>
                <Field label="Department">
                    <input type="text" name="department" required value={formData.department} onChange={handleChange} className={inputClass} placeholder="e.g. Operations" />
                </Field>
                <Field label="Location">
                    <input type="text" name="location" required value={formData.location} onChange={handleChange} className={inputClass} placeholder="e.g. Mumbai, India / Remote" />
                </Field>
                <Field label="Employment type">
                    <select name="type" value={formData.type} onChange={handleChange} className={inputClass}>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Freelance">Freelance</option>
                        <option value="Internship">Internship</option>
                    </select>
                </Field>
                <Field label="Status" hint="Only active openings are shown on the Careers page.">
                    <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                    </select>
                </Field>
            </div>

            <Field label="Description">
                <textarea
                    name="description"
                    required
                    rows={8}
                    value={formData.description}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Job description, responsibilities, and requirements..."
                />
            </Field>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit" loading={isSubmitting}>{job ? 'Update job' : 'Post job'}</Button>
            </div>
        </form>
    )
}
