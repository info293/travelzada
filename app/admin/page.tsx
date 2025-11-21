'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import PackageForm from '@/components/admin/PackageForm'

interface DestinationPackage {
  id?: string
  Destination_ID: string
  Destination_Name: string
  Overview: string
  Duration: string
  Mood: string
  Occasion: string
  Travel_Type: string
  Budget_Category: string
  Price_Range_INR: string
  Theme: string
  Adventure_Level: string
  Stay_Type: string
  Star_Category: string
  Meal_Plan: string
  Group_Size: string
  Child_Friendly: string
  Elderly_Friendly: string
  Language_Preference: string
  Seasonality: string
  Hotel_Examples: string
  Inclusions: string
  Exclusions: string
  Day_Wise_Itinerary: string
  Rating: string
  Location_Breakup: string
  Airport_Code: string
  Transfer_Type: string
  Currency: string
  Climate_Type: string
  Safety_Score: string
  Sustainability_Score: string
  Ideal_Traveler_Persona: string
  Created_By: string
  Last_Updated: string
  Slug: string
  Primary_Image_URL: string
  Booking_URL: string
  Price_Min_INR: number
  Price_Max_INR: number
  Duration_Nights: number
  Duration_Days: number
  SEO_Title: string
  SEO_Description: string
  SEO_Keywords: string
  Meta_Image_URL: string
}

interface BlogPost {
  id?: string
  title: string
  subtitle?: string
  description: string
  content: string
  image: string
  author: string
  authorImage?: string
  date: string
  category: string
  readTime?: string
  likes?: number
  comments?: number
  shares?: number
  featured?: boolean
  published?: boolean
  createdAt?: string
  updatedAt?: string
}

interface User {
  id?: string
  email: string
  displayName?: string
  photoURL?: string
  role: 'user' | 'admin'
  createdAt: string
  lastLogin?: string
  isActive: boolean
}

type TabType = 'packages' | 'blogs' | 'users' | 'dashboard'

export default function AdminDashboard() {
  const { currentUser, isAdmin, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [packages, setPackages] = useState<DestinationPackage[]>([])
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBlogForm, setShowBlogForm] = useState(false)
  const [editingPackage, setEditingPackage] = useState<DestinationPackage | null>(null)
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null)
  const [formData, setFormData] = useState<Partial<DestinationPackage>>({})
  const [blogFormData, setBlogFormData] = useState<Partial<BlogPost>>({})
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkImportJson, setBulkImportJson] = useState('')
  const [bulkImportStatus, setBulkImportStatus] = useState<{
    loading: boolean
    success: number
    errors: string[]
    processing: boolean
  }>({
    loading: false,
    success: 0,
    errors: [],
    processing: false,
  })

  useEffect(() => {
    if (!loading && (!currentUser || !isAdmin)) {
      router.push('/')
    }
  }, [currentUser, isAdmin, loading, router])

  useEffect(() => {
    if (isAdmin) {
      fetchAllData()
    }
  }, [isAdmin, activeTab])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchPackages(),
        fetchBlogs(),
        fetchUsers(),
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPackages = async () => {
    try {
      const dbInstance = getDbInstance()
      const q = query(collection(dbInstance, 'packages'), orderBy('Last_Updated', 'desc'))
      const querySnapshot = await getDocs(q)
      const packagesData: DestinationPackage[] = []
      querySnapshot.forEach((doc) => {
        packagesData.push({ id: doc.id, ...doc.data() } as DestinationPackage)
      })
      setPackages(packagesData)
    } catch (error) {
      console.error('Error fetching packages:', error)
    }
  }

  const fetchBlogs = async () => {
    try {
      const dbInstance = getDbInstance()
      const q = query(collection(dbInstance, 'blogs'), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      const blogsData: BlogPost[] = []
      querySnapshot.forEach((doc) => {
        blogsData.push({ id: doc.id, ...doc.data() } as BlogPost)
      })
      setBlogs(blogsData)
    } catch (error) {
      console.error('Error fetching blogs:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const dbInstance = getDbInstance()
      // Try to fetch with orderBy, but fallback to simple query if createdAt doesn't exist
      let querySnapshot
      try {
        const q = query(collection(dbInstance, 'users'), orderBy('createdAt', 'desc'))
        querySnapshot = await getDocs(q)
      } catch (orderError) {
        // If orderBy fails (e.g., no createdAt field), fetch without ordering
        console.log('OrderBy failed, fetching without order:', orderError)
        querySnapshot = await getDocs(collection(dbInstance, 'users'))
      }
      
      const usersData: User[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        usersData.push({ 
          id: doc.id, 
          email: data.email || '',
          displayName: data.displayName || '',
          photoURL: data.photoURL || '',
          role: data.role || 'user',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          lastLogin: data.lastLogin?.toDate?.()?.toISOString() || data.lastLogin || '',
          isActive: data.isActive !== undefined ? data.isActive : true,
        } as User)
      })
      
      // Sort manually if needed
      usersData.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      
      setUsers(usersData)
      console.log('Fetched users:', usersData.length)
    } catch (error) {
      console.error('Error fetching users:', error)
      alert('Error fetching users. Check console for details.')
    }
  }

  // Helper to ensure db is available
  const getDbInstance = () => {
    if (typeof window === 'undefined' || !db) {
      throw new Error('Firestore is not available. Make sure you are using this on the client side.')
    }
    return db
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const numericFields = ['Price_Min_INR', 'Price_Max_INR', 'Duration_Nights', 'Duration_Days']
      if (numericFields.includes(name)) {
        return {
          ...prev,
          [name]: value === '' ? '' : (isNaN(Number(value)) ? prev[name as keyof typeof prev] : Number(value)),
        }
      }
      return {
        ...prev,
        [name]: value,
      }
    })
  }

  const handleBlogInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setBlogFormData((prev) => {
      if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked
        return { ...prev, [name]: checked }
      }
      if (name === 'likes' || name === 'comments' || name === 'shares') {
        return { ...prev, [name]: value === '' ? 0 : Number(value) }
      }
      return { ...prev, [name]: value }
    })
  }

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
    if (!formData.Destination_ID || !formData.Destination_Name) {
      alert('Please provide both Destination ID and Destination Name before saving.')
      return
    }

      const packageData: any = {
        ...formData,
        Last_Updated: new Date().toISOString().split('T')[0],
        Created_By: currentUser?.email || 'Admin',
      }

      const dbInstance = getDbInstance()
      if (editingPackage?.id) {
        await updateDoc(doc(dbInstance, 'packages', editingPackage.id), packageData)
      } else {
        await addDoc(collection(dbInstance, 'packages'), packageData)
      }

      setShowForm(false)
      setEditingPackage(null)
      setFormData({})
      fetchPackages()
    } catch (error) {
      console.error('Error saving package:', error)
      alert('Error saving package. Please try again.')
    }
  }

  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const now = new Date().toISOString()
      const blogData: any = {
        title: blogFormData.title || '',
        subtitle: blogFormData.subtitle,
        description: blogFormData.description || '',
        content: blogFormData.content || '',
        image: blogFormData.image || '',
        author: blogFormData.author || currentUser?.email?.split('@')[0] || 'Admin',
        authorImage: blogFormData.authorImage,
        date: blogFormData.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
        category: blogFormData.category || 'Travel Tips',
        readTime: blogFormData.readTime || '5 min read',
        likes: blogFormData.likes || 0,
        comments: blogFormData.comments || 0,
        shares: blogFormData.shares || 0,
        featured: blogFormData.featured || false,
        published: blogFormData.published !== undefined ? blogFormData.published : true,
        createdAt: editingBlog?.createdAt || now,
        updatedAt: now,
      }

      const dbInstance = getDbInstance()
      if (editingBlog?.id) {
        await updateDoc(doc(dbInstance, 'blogs', editingBlog.id), blogData)
      } else {
        await addDoc(collection(dbInstance, 'blogs'), blogData)
      }

      setShowBlogForm(false)
      setEditingBlog(null)
      setBlogFormData({})
      fetchBlogs()
    } catch (error) {
      console.error('Error saving blog:', error)
      alert('Error saving blog. Please try again.')
    }
  }

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return
    try {
      const dbInstance = getDbInstance()
      await deleteDoc(doc(dbInstance, 'packages', id))
      fetchPackages()
    } catch (error) {
      console.error('Error deleting package:', error)
      alert('Error deleting package. Please try again.')
    }
  }

  const handleDeleteBlog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return
    try {
      const dbInstance = getDbInstance()
      await deleteDoc(doc(dbInstance, 'blogs', id))
      fetchBlogs()
    } catch (error) {
      console.error('Error deleting blog:', error)
      alert('Error deleting blog. Please try again.')
    }
  }

  const handleEditPackage = (pkg: DestinationPackage) => {
    setEditingPackage(pkg)
    setFormData(pkg)
    setShowForm(true)
    setActiveTab('packages')
  }

  const handleEditBlog = (blog: BlogPost) => {
    setEditingBlog(blog)
    setBlogFormData(blog)
    setShowBlogForm(true)
    setActiveTab('blogs')
  }

  const handleNewPackage = () => {
    setEditingPackage(null)
    setFormData({})
    setShowForm(true)
    setActiveTab('packages')
  }

  const handleNewBlog = () => {
    setEditingBlog(null)
    setBlogFormData({})
    setShowBlogForm(true)
    setActiveTab('blogs')
  }

  const handleBulkImport = async () => {
    if (!bulkImportJson.trim()) {
      alert('Please paste JSON data before importing.')
      return
    }

    setBulkImportStatus({
      loading: true,
      success: 0,
      errors: [],
      processing: true,
    })

    try {
      // Parse JSON
      let packagesData: DestinationPackage[]
      try {
        packagesData = JSON.parse(bulkImportJson)
      } catch (parseError) {
        setBulkImportStatus({
          loading: false,
          success: 0,
          errors: [`Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`],
          processing: false,
        })
        return
      }

      // Validate it's an array
      if (!Array.isArray(packagesData)) {
        setBulkImportStatus({
          loading: false,
          success: 0,
          errors: ['JSON must be an array of package objects'],
          processing: false,
        })
        return
      }

      if (packagesData.length === 0) {
        setBulkImportStatus({
          loading: false,
          success: 0,
          errors: ['JSON array is empty'],
          processing: false,
        })
        return
      }

      const dbInstance = getDbInstance()
      const errors: string[] = []
      let successCount = 0

      // Process packages one by one
      for (let i = 0; i < packagesData.length; i++) {
        const pkg = packagesData[i]
        
        try {
          // Validate required fields
          if (!pkg.Destination_ID || !pkg.Destination_Name) {
            errors.push(`Package ${i + 1}: Missing required fields (Destination_ID or Destination_Name)`)
            continue
          }

          // Prepare package data
          const packageData: any = {
            ...pkg,
            Last_Updated: new Date().toISOString().split('T')[0],
            Created_By: currentUser?.email || 'Bulk Import',
          }

          // Add to Firestore
          await addDoc(collection(dbInstance, 'packages'), packageData)
          successCount++
        } catch (error) {
          errors.push(`Package ${i + 1} (${pkg.Destination_ID || 'Unknown'}): ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      setBulkImportStatus({
        loading: false,
        success: successCount,
        errors,
        processing: false,
      })

      if (successCount > 0) {
        fetchPackages()
      }
    } catch (error) {
      setBulkImportStatus({
        loading: false,
        success: 0,
        errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        processing: false,
      })
    }
  }

  const handleBulkImportCancel = () => {
    setShowBulkImport(false)
    setBulkImportJson('')
    setBulkImportStatus({
      loading: false,
      success: 0,
      errors: [],
      processing: false,
    })
  }

  const handleUpdateUserRole = async (userId: string, newRole: 'user' | 'admin', currentRole: 'user' | 'admin') => {
    if (!userId) {
      alert('User ID is required')
      return
    }

    if (newRole === currentRole) {
      return // No change needed
    }

    if (!confirm(`Are you sure you want to change this user's role from ${currentRole} to ${newRole}?`)) {
      return
    }

    try {
      const dbInstance = getDbInstance()
      const userRef = doc(dbInstance, 'users', userId)
      await updateDoc(userRef, {
        role: newRole,
      })

      // Refresh users list
      await fetchUsers()
      
      // If updating own role, show special message
      if (userId === currentUser?.uid) {
        alert(`Your role has been updated to ${newRole}. Please refresh the page or sign out and sign back in for the changes to take effect.`)
      } else {
        alert(`User role updated to ${newRole} successfully!`)
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      alert(`Error updating user role: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const loadSampleTemplate = () => {
    const sample = [
      {
        "Destination_ID": "DEST_SAMPLE_001",
        "Destination_Name": "Sample Destination",
        "Overview": "A beautiful destination for your next vacation",
        "Duration": "3 Nights / 4 Days",
        "Mood": "Relax",
        "Occasion": "Family Vacation",
        "Travel_Type": "Family",
        "Budget_Category": "Mid",
        "Price_Range_INR": "₹50,000 – ₹70,000 per person",
        "Theme": "Beach / Culture",
        "Adventure_Level": "Light",
        "Stay_Type": "Resort",
        "Star_Category": "4-Star",
        "Meal_Plan": "Breakfast Only",
        "Group_Size": "2 Adults + 1 Child",
        "Child_Friendly": "Yes",
        "Elderly_Friendly": "Yes",
        "Language_Preference": "English",
        "Seasonality": "All Year",
        "Hotel_Examples": "Sample Resort, Example Hotel",
        "Inclusions": "4★ stay with breakfast, airport transfers, city tour",
        "Exclusions": "Flights, meals other than breakfast, personal expenses",
        "Day_Wise_Itinerary": "Day 1: Arrive & relax | Day 2: City tour | Day 3: Beach activities | Day 4: Depart",
        "Rating": "4.5/5",
        "Location_Breakup": "3N Main City",
        "Airport_Code": "XXX",
        "Transfer_Type": "Private",
        "Currency": "INR",
        "Climate_Type": "Tropical",
        "Safety_Score": "8/10",
        "Sustainability_Score": "7/10",
        "Ideal_Traveler_Persona": "Families seeking a relaxing beach vacation",
        "Slug": "sample-destination",
        "Primary_Image_URL": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1600&q=80",
        "Booking_URL": "https://travelzada.com/packages/DEST_SAMPLE_001",
        "Price_Min_INR": 50000,
        "Price_Max_INR": 70000,
        "Duration_Nights": 3,
        "Duration_Days": 4,
        "SEO_Title": "Sample Destination Package | 3-Night Family Getaway",
        "SEO_Description": "Experience a wonderful 3-night family vacation at our sample destination with resort stays and tours included.",
        "SEO_Keywords": "sample destination, family vacation, beach holiday",
        "Meta_Image_URL": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1600&q=80"
      }
    ]
    setBulkImportJson(JSON.stringify(sample, null, 2))
  }

  if (loading || isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-2">You need admin privileges to access this page.</p>
            <p className="text-sm text-gray-500 mb-4">Logged in as: <strong>{currentUser?.email}</strong></p>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage packages, blogs, and users</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Packages</p>
                <p className="text-3xl font-bold text-gray-900">{packages.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Blogs</p>
                <p className="text-3xl font-bold text-gray-900">{blogs.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Published Blogs</p>
                <p className="text-3xl font-bold text-gray-900">{blogs.filter(b => b.published).length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'dashboard'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('packages')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'packages'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Packages ({packages.length})
              </button>
              <button
                onClick={() => setActiveTab('blogs')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'blogs'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Blogs ({blogs.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Users ({users.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
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
                  onClick={() => {
                    setActiveTab('packages')
                    setShowBulkImport(true)
                  }}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-600 hover:bg-green-50 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="font-semibold text-gray-700">Bulk Import Packages</span>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-semibold text-gray-700">View Users</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Packages</h3>
                <div className="space-y-3">
                  {packages.slice(0, 5).map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">{pkg.Destination_Name}</p>
                        <p className="text-sm text-gray-500">{pkg.Duration}</p>
                      </div>
                      <button
                        onClick={() => handleEditPackage(pkg)}
                        className="text-primary hover:text-primary-dark text-sm font-semibold"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                  {packages.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No packages yet</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Blog Posts</h3>
                <div className="space-y-3">
                  {blogs.slice(0, 5).map((blog) => (
                    <div key={blog.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">{blog.title}</p>
                        <p className="text-sm text-gray-500">{blog.category} • {blog.date}</p>
                      </div>
                      <button
                        onClick={() => handleEditBlog(blog)}
                        className="text-primary hover:text-primary-dark text-sm font-semibold"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                  {blogs.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No blog posts yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Packages Tab - Keep existing package form and table */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            {showForm && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingPackage ? 'Edit Package' : 'Create New Package'}
                </h2>
                <PackageForm
                  formData={formData}
                  handleInputChange={handleInputChange}
                  editingPackage={editingPackage}
                  onSubmit={handlePackageSubmit}
                  onCancel={() => {
                    setShowForm(false)
                    setEditingPackage(null)
                    setFormData({})
                  }}
                />
              </div>
            )}

            {!showForm && !showBulkImport && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">All Packages</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowBulkImport(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Bulk Import JSON
                    </button>
                    <button
                      onClick={handleNewPackage}
                      className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
                    >
                      + Add New
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {packages.map((pkg) => (
                        <tr key={pkg.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{pkg.Destination_Name}</div>
                            <div className="text-sm text-gray-500">{pkg.Destination_ID}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{pkg.Duration}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{pkg.Price_Range_INR}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{pkg.Travel_Type}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleEditPackage(pkg)}
                              className="text-primary hover:text-primary-dark mr-4 text-sm font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg.id!)}
                              className="text-red-600 hover:text-red-800 text-sm font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {packages.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No packages found</div>
                  )}
                </div>
              </div>
            )}

            {/* Bulk Import Section */}
            {showBulkImport && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Bulk Import Packages (JSON)</h2>
                  <button
                    onClick={handleBulkImportCancel}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Paste JSON Array of Packages
                      </label>
                      <button
                        type="button"
                        onClick={loadSampleTemplate}
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Load Sample Template
                      </button>
                    </div>
                    <textarea
                      value={bulkImportJson}
                      onChange={(e) => setBulkImportJson(e.target.value)}
                      placeholder={`[\n  {\n    "Destination_ID": "DEST_001_BALI",\n    "Destination_Name": "Bali, Indonesia",\n    "Overview": "Romantic island escape...",\n    "Duration": "5 Nights / 6 Days",\n    ...\n  },\n  ...\n]`}
                      rows={15}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 font-semibold mb-2">📋 JSON Format Requirements:</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>Must be a valid JSON array: <code className="bg-blue-100 px-1 rounded">[{`{...}`}]</code></li>
                      <li>Each package object must have <code className="bg-blue-100 px-1 rounded">Destination_ID</code> and <code className="bg-blue-100 px-1 rounded">Destination_Name</code></li>
                      <li>All other fields are optional but recommended</li>
                      <li>See <code className="bg-blue-100 px-1 rounded">data/destination_package.json</code> for example format</li>
                    </ul>
                  </div>

                  {bulkImportStatus.processing && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-yellow-800 font-semibold">
                          Processing packages... Please wait.
                        </p>
                      </div>
                    </div>
                  )}

                  {!bulkImportStatus.processing && (bulkImportStatus.success > 0 || bulkImportStatus.errors.length > 0) && (
                    <div className="space-y-3">
                      {bulkImportStatus.success > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm text-green-800 font-semibold">
                            ✅ Successfully imported {bulkImportStatus.success} package{bulkImportStatus.success !== 1 ? 's' : ''}!
                          </p>
                        </div>
                      )}
                      {bulkImportStatus.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-sm text-red-800 font-semibold mb-2">
                            ❌ {bulkImportStatus.errors.length} error{bulkImportStatus.errors.length !== 1 ? 's' : ''} occurred:
                          </p>
                          <ul className="text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                            {bulkImportStatus.errors.map((error, idx) => (
                              <li key={idx} className="list-disc list-inside">{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={handleBulkImport}
                      disabled={bulkImportStatus.processing || !bulkImportJson.trim()}
                      className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {bulkImportStatus.processing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Importing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Import Packages
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleBulkImportCancel}
                      disabled={bulkImportStatus.processing}
                      className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Blogs Tab */}
        {activeTab === 'blogs' && (
          <div className="space-y-6">
            {showBlogForm && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
                </h2>
                <form onSubmit={handleBlogSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={blogFormData.title || ''}
                        onChange={handleBlogInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Subtitle</label>
                      <input
                        type="text"
                        name="subtitle"
                        value={blogFormData.subtitle || ''}
                        onChange={handleBlogInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                      <input
                        type="text"
                        name="category"
                        value={blogFormData.category || ''}
                        onChange={handleBlogInputChange}
                        required
                        placeholder="Travel Tips"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Author *</label>
                      <input
                        type="text"
                        name="author"
                        value={blogFormData.author || ''}
                        onChange={handleBlogInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                      <input
                        type="text"
                        name="date"
                        value={blogFormData.date || ''}
                        onChange={handleBlogInputChange}
                        placeholder="NOV 11"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Read Time</label>
                      <input
                        type="text"
                        name="readTime"
                        value={blogFormData.readTime || ''}
                        onChange={handleBlogInputChange}
                        placeholder="5 min read"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL *</label>
                      <input
                        type="url"
                        name="image"
                        value={blogFormData.image || ''}
                        onChange={handleBlogInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                      <textarea
                        name="description"
                        value={blogFormData.description || ''}
                        onChange={handleBlogInputChange}
                        required
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Content *</label>
                      <textarea
                        name="content"
                        value={blogFormData.content || ''}
                        onChange={handleBlogInputChange}
                        required
                        rows={10}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="featured"
                          checked={blogFormData.featured || false}
                          onChange={handleBlogInputChange}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm font-semibold text-gray-700">Featured</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="published"
                          checked={blogFormData.published !== undefined ? blogFormData.published : true}
                          onChange={handleBlogInputChange}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm font-semibold text-gray-700">Published</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                    >
                      {editingBlog ? 'Update Blog' : 'Create Blog'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBlogForm(false)
                        setEditingBlog(null)
                        setBlogFormData({})
                      }}
                      className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!showBlogForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">All Blog Posts</h2>
                  <button
                    onClick={handleNewBlog}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
                  >
                    + Add New
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {blogs.map((blog) => (
                        <tr key={blog.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{blog.title}</div>
                            {blog.subtitle && <div className="text-sm text-gray-500">{blog.subtitle}</div>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{blog.category}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{blog.author}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{blog.date}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              blog.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {blog.published ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleEditBlog(blog)}
                              className="text-primary hover:text-primary-dark mr-4 text-sm font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBlog(blog.id!)}
                              className="text-red-600 hover:text-red-800 text-sm font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {blogs.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No blog posts found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">All Users ({users.length})</h2>
                <div className="flex gap-2">
                  <button
                    onClick={fetchUsers}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
                  >
                    🔄 Refresh
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (!currentUser) {
                          alert('Please log in first to sync your user data.')
                          return
                        }
                        
                        // Create/update current user's document
                        const dbInstance = getDbInstance()
                        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
                        const userRef = doc(dbInstance, 'users', currentUser.uid)
                        await setDoc(userRef, {
                          email: currentUser.email,
                          displayName: currentUser.displayName || '',
                          photoURL: currentUser.photoURL || '',
                          role: isAdmin ? 'admin' : 'user',
                          createdAt: serverTimestamp(),
                          lastLogin: serverTimestamp(),
                          isActive: true,
                        }, { merge: true })
                        
                        alert('User document created/updated! Refreshing...')
                        fetchUsers()
                      } catch (error: any) {
                        console.error('Error syncing user:', error)
                        alert(`Error syncing user: ${error.message}. Check console for details.`)
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    + Sync Current User
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.email} className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-semibold">
                                {user.email?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{user.displayName || 'User'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(e) => {
                              const newRole = e.target.value as 'user' | 'admin'
                              handleUpdateUserRole(user.id!, newRole, user.role)
                            }}
                            className={`text-xs px-3 py-1.5 border rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800 border-purple-300' 
                                : 'bg-gray-100 text-gray-800 border-gray-300'
                            }`}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                          {user.id === currentUser?.uid && (
                            <span className="text-xs text-gray-500 italic">(You)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">No users found in Firestore</div>
                  <div className="text-sm text-gray-400 mb-4">
                    Users are automatically created when they sign up. If you don't see any users:
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>1. Make sure users have signed up after the user creation feature was added</p>
                    <p>2. Click "Sync Current User" to create your own user document</p>
                    <p>3. Check the browser console for any errors</p>
                  </div>
                </div>
              )}
              </div>
            </div>
            
            {/* Info Box */}
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-semibold mb-2">👤 Role Management:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Use the dropdown in the "Actions" column to change user roles</li>
                  <li>Users with "Admin" role can access the admin dashboard and manage content</li>
                  <li>If you change your own role, please refresh the page or sign out and sign back in for changes to take effect</li>
                </ul>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-semibold mb-2">💡 Note:</p>
                <p className="text-xs text-yellow-700">
                  User documents are created automatically when users sign up. If you signed up before this feature was added, 
                  click "Sync Current User" to create your user document. You can also check the browser console (F12) for any errors.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
