'use client'

import { useState, useMemo } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { BlogPost } from './types'

interface BlogsSectionProps {
    blogs: BlogPost[]
    fetchBlogs: () => Promise<void>
    showBlogForm: boolean
    setShowBlogForm: (show: boolean) => void
    showBlogBulkImport: boolean
    setShowBlogBulkImport: (show: boolean) => void
    editingBlog: BlogPost | null
    handleNewBlog: () => void
    handleEditBlog: (blog: BlogPost) => void
    // Form rendering is passed from parent since it's complex
    renderBlogForm: () => React.ReactNode
    renderBlogBulkImport: () => React.ReactNode
}

type SortField = 'title' | 'category' | 'date' | 'createdAt' | 'views'
type SortDirection = 'asc' | 'desc'

export default function BlogsSection({
    blogs,
    fetchBlogs,
    showBlogForm,
    setShowBlogForm,
    showBlogBulkImport,
    setShowBlogBulkImport,
    editingBlog,
    handleNewBlog,
    handleEditBlog,
    renderBlogForm,
    renderBlogBulkImport,
}: BlogsSectionProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [publishedFilter, setPublishedFilter] = useState<string>('all')
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    const categories = useMemo(() => [...new Set(blogs.map(b => b.category))].filter(Boolean).sort(), [blogs])

    const filteredAndSorted = useMemo(() => {
        let result = [...blogs]

        if (categoryFilter !== 'all') {
            result = result.filter(b => b.category === categoryFilter)
        }

        if (publishedFilter !== 'all') {
            const isPublished = publishedFilter === 'published'
            result = result.filter(b => b.published === isPublished)
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(b =>
                b.title?.toLowerCase().includes(query) ||
                b.description?.toLowerCase().includes(query) ||
                b.author?.toLowerCase().includes(query)
            )
        }

        result.sort((a, b) => {
            let cmp = 0
            switch (sortField) {
                case 'title': cmp = (a.title || '').localeCompare(b.title || ''); break
                case 'category': cmp = (a.category || '').localeCompare(b.category || ''); break
                case 'date': cmp = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime(); break
                case 'views': cmp = (a.views || 0) - (b.views || 0); break
                default: cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            }
            return sortDirection === 'desc' ? -cmp : cmp
        })

        return result
    }, [blogs, categoryFilter, publishedFilter, searchQuery, sortField, sortDirection])

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDirection('desc') }
    }

    const SortIcon = ({ field }: { field: SortField }) => (
        <span className="ml-1">{sortField === field ? (sortDirection === 'desc' ? '↓' : '↑') : <span className="text-gray-300">↕</span>}</span>
    )

    const handleDeleteBlog = async (id: string) => {
        if (!confirm('Are you sure you want to delete this blog post?')) return
        try {
            await deleteDoc(doc(db, 'blogs', id))
            fetchBlogs()
            alert('Blog post deleted successfully!')
        } catch (error) {
            console.error('Error deleting blog:', error)
            alert('Error deleting blog. Please try again.')
        }
    }

    if (showBlogForm) {
        return <div className="space-y-6">{renderBlogForm()}</div>
    }

    if (showBlogBulkImport) {
        return <div className="space-y-6">{renderBlogBulkImport()}</div>
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <h2 className="text-xl font-bold text-gray-900">Blog Posts ({filteredAndSorted.length}{filteredAndSorted.length !== blogs.length ? ` of ${blogs.length}` : ''})</h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <input type="text" placeholder="Search blogs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary w-48" />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="all">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={publishedFilter} onChange={(e) => setPublishedFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                <option value="all">All Status</option>
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                            </select>
                            <button onClick={() => setShowBlogBulkImport(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Bulk Import
                            </button>
                            <button onClick={handleNewBlog} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors">+ Add New</button>
                            <button onClick={fetchBlogs} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">🔄</button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('title')}>Title <SortIcon field="title" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('category')}>Category <SortIcon field="category" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('views')}>Views <SortIcon field="views" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>Created <SortIcon field="createdAt" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAndSorted.map((blog) => (
                                <tr key={blog.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 max-w-xs truncate" title={blog.title}>{blog.title}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{blog.category}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{blog.author}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${blog.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {blog.published ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{blog.views || 0}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleEditBlog(blog)} className="text-primary hover:text-primary-dark text-sm font-semibold">Edit</button>
                                            <button onClick={() => handleDeleteBlog(blog.id!)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold transition-colors">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAndSorted.length === 0 && (
                        <div className="text-center py-12 text-gray-500">{blogs.length === 0 ? 'No blog posts found' : 'No blogs match your filters'}</div>
                    )}
                </div>
            </div>
        </div>
    )
}
