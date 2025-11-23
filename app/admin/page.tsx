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
  deleteField,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import PackageForm from '@/components/admin/PackageForm'
import ViewModal from '@/components/admin/ViewModal'
import type { ReactNode } from 'react'

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
  Guest_Reviews?: Array<{
    name: string
    content: string
    date: string
    rating?: string
  }>
  Booking_Policies?: {
    booking?: string[]
    payment?: string[]
    cancellation?: string[]
  }
  FAQ_Items?: Array<{
    question: string
    answer: string
  }>
  Why_Book_With_Us?: Array<{
    label: string
    description: string
  }>
}

interface BlogSection {
  type: 'intro' | 'paragraph' | 'heading' | 'subheading' | 'image' | 'quote' | 'list' | 'cta' | 'divider' | 'faq' | 'toc' | 'related'
  content?: string
  text?: string
  imageUrl?: string
  imageAlt?: string
  items?: string[]
  author?: string
  link?: string
  linkText?: string
  question?: string
  answer?: string
  faqs?: Array<{ question: string; answer: string }>
  relatedLinks?: Array<{ title: string; url: string; description?: string }>
}

interface BlogPost {
  id?: string
  title: string
  subtitle?: string
  description: string
  content: string
  blogStructure?: BlogSection[] // Rich content structure for best user experience
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
  // SEO Fields
  metaTitle?: string
  metaDescription?: string
  keywords?: string[]
  canonicalUrl?: string
  ogImage?: string
  schemaType?: 'Article' | 'BlogPosting' | 'NewsArticle'
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

type TabType = 'packages' | 'blogs' | 'users' | 'destinations' | 'subscribers' | 'contacts' | 'leads' | 'careers' | 'testimonials' | 'dashboard'

interface Testimonial {
  id?: string
  name: string
  rating: number
  quote: string
  featured?: boolean
  createdAt?: string
  updatedAt?: string
}

interface Destination {
  id?: string
  name: string
  country: string
  description: string
  image: string
  slug: string
  featured?: boolean
  packageIds?: string[] // Array of package Destination_IDs linked to this destination
  // Additional fields for frontend
  bestTimeToVisit?: string
  duration?: string
  currency?: string
  language?: string
  highlights?: string[] // Array of highlight strings
  activities?: string[] // Array of activity strings
  budgetRange?: {
    budget: string
    midRange: string
    luxury: string
  }
  hotelTypes?: string[] // Array of hotel type strings
  createdAt?: string
  updatedAt?: string
}

export default function AdminDashboard() {
  const { currentUser, isAdmin, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [packages, setPackages] = useState<DestinationPackage[]>([])
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [subscribers, setSubscribers] = useState<Array<{ id?: string; email: string; subscribedAt: any; status: string; source?: string }>>([])
  const [contactMessages, setContactMessages] = useState<Array<{ id?: string; name: string; email: string; phone: string; subject: string; message: string; status: string; createdAt: any; read: boolean }>>([])
  const [leads, setLeads] = useState<Array<{ id?: string; name: string; mobile: string; sourceUrl: string; packageName: string; status: string; createdAt: any; read: boolean }>>([])
  const [jobApplications, setJobApplications] = useState<Array<{ id?: string; name: string; email: string; phone: string; linkedin: string; position: string; coverLetter: string; status: string; createdAt: any; read: boolean }>>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [showTestimonialForm, setShowTestimonialForm] = useState(false)
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null)
  const [testimonialFormData, setTestimonialFormData] = useState<Partial<Testimonial>>({})
  const [showDestinationForm, setShowDestinationForm] = useState(false)
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null)
  const [destinationFormData, setDestinationFormData] = useState<Partial<Destination>>({})
  const [packageIdsInput, setPackageIdsInput] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBlogForm, setShowBlogForm] = useState(false)
  const [editingPackage, setEditingPackage] = useState<DestinationPackage | null>(null)
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null)
  const [formData, setFormData] = useState<Partial<DestinationPackage>>({})
  const [blogFormData, setBlogFormData] = useState<Partial<BlogPost> & { blogStructure?: BlogSection[] | string }>({})
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
  const [viewModal, setViewModal] = useState<{ isOpen: boolean; title: string; content: ReactNode | null }>({
    isOpen: false,
    title: '',
    content: null,
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
        fetchDestinations(),
        fetchSubscribers(),
        fetchContactMessages(),
        fetchLeads(),
        fetchJobApplications(),
        fetchTestimonials(),
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

  const fetchDestinations = async () => {
    try {
      const dbInstance = getDbInstance()
      const querySnapshot = await getDocs(collection(dbInstance, 'destinations'))
      const destinationsData: Destination[] = []
      querySnapshot.forEach((doc) => {
        destinationsData.push({ id: doc.id, ...doc.data() } as Destination)
      })
      setDestinations(destinationsData)
    } catch (error) {
      console.error('Error fetching destinations:', error)
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

  const fetchSubscribers = async () => {
    try {
      const dbInstance = getDbInstance()
      let querySnapshot
      try {
        const q = query(collection(dbInstance, 'newsletter_subscribers'), orderBy('subscribedAt', 'desc'))
        querySnapshot = await getDocs(q)
      } catch (orderError) {
        console.log('OrderBy failed for subscribers, fetching without order:', orderError)
        querySnapshot = await getDocs(collection(dbInstance, 'newsletter_subscribers'))
      }
      
      const subscribersData: Array<{ id?: string; email: string; subscribedAt: any; status: string; source?: string }> = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        subscribersData.push({
          id: doc.id,
          email: data.email || '',
          subscribedAt: data.subscribedAt?.toDate?.()?.toISOString() || data.subscribedAt || new Date().toISOString(),
          status: data.status || 'active',
          source: data.source || 'unknown',
        })
      })
      
      // Sort manually if needed
      subscribersData.sort((a, b) => {
        const dateA = new Date(a.subscribedAt).getTime()
        const dateB = new Date(b.subscribedAt).getTime()
        return dateB - dateA
      })
      
      setSubscribers(subscribersData)
      console.log('Fetched subscribers:', subscribersData.length)
    } catch (error) {
      console.error('Error fetching subscribers:', error)
    }
  }

  const fetchContactMessages = async () => {
    try {
      const dbInstance = getDbInstance()
      let querySnapshot
      try {
        const q = query(collection(dbInstance, 'contact_messages'), orderBy('createdAt', 'desc'))
        querySnapshot = await getDocs(q)
      } catch (orderError) {
        console.log('OrderBy failed for contact messages, fetching without order:', orderError)
        querySnapshot = await getDocs(collection(dbInstance, 'contact_messages'))
      }
      
      const messagesData: Array<{ id?: string; name: string; email: string; phone: string; subject: string; message: string; status: string; createdAt: any; read: boolean }> = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        messagesData.push({
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          subject: data.subject || '',
          message: data.message || '',
          status: data.status || 'new',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          read: data.read || false,
        })
      })
      
      // Sort manually if needed
      messagesData.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      
      setContactMessages(messagesData)
      console.log('Fetched contact messages:', messagesData.length)
    } catch (error) {
      console.error('Error fetching contact messages:', error)
    }
  }

  const fetchLeads = async () => {
    try {
      const dbInstance = getDbInstance()
      let querySnapshot
      try {
        const q = query(collection(dbInstance, 'leads'), orderBy('createdAt', 'desc'))
        querySnapshot = await getDocs(q)
      } catch (orderError) {
        console.log('OrderBy failed for leads, fetching without order:', orderError)
        querySnapshot = await getDocs(collection(dbInstance, 'leads'))
      }
      
      const leadsData: Array<{ id?: string; name: string; mobile: string; sourceUrl: string; packageName: string; status: string; createdAt: any; read: boolean }> = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        leadsData.push({
          id: doc.id,
          name: data.name || '',
          mobile: data.mobile || '',
          sourceUrl: data.sourceUrl || '',
          packageName: data.packageName || '',
          status: data.status || 'new',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          read: data.read || false,
        })
      })
      
      // Sort manually if needed
      leadsData.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      
      setLeads(leadsData)
      console.log('Fetched leads:', leadsData.length)
    } catch (error) {
      console.error('Error fetching leads:', error)
    }
  }

  const fetchJobApplications = async () => {
    try {
      const dbInstance = getDbInstance()
      let querySnapshot
      try {
        const q = query(collection(dbInstance, 'job_applications'), orderBy('createdAt', 'desc'))
        querySnapshot = await getDocs(q)
      } catch (orderError) {
        console.log('OrderBy failed for job applications, fetching without order:', orderError)
        querySnapshot = await getDocs(collection(dbInstance, 'job_applications'))
      }
      
      const applicationsData: Array<{ id?: string; name: string; email: string; phone: string; linkedin: string; position: string; coverLetter: string; status: string; createdAt: any; read: boolean }> = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        applicationsData.push({
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          linkedin: data.linkedin || '',
          position: data.position || '',
          coverLetter: data.coverLetter || '',
          status: data.status || 'new',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          read: data.read || false,
        })
      })
      
      // Sort manually if needed
      applicationsData.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      
      setJobApplications(applicationsData)
      console.log('Fetched job applications:', applicationsData.length)
    } catch (error) {
      console.error('Error fetching job applications:', error)
    }
  }

  const fetchTestimonials = async () => {
    try {
      const dbInstance = getDbInstance()
      let querySnapshot
      try {
        const q = query(collection(dbInstance, 'testimonials'), orderBy('createdAt', 'desc'))
        querySnapshot = await getDocs(q)
      } catch (orderError) {
        console.log('OrderBy failed for testimonials, fetching without order:', orderError)
        querySnapshot = await getDocs(collection(dbInstance, 'testimonials'))
      }
      
      const testimonialsData: Testimonial[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        testimonialsData.push({
          id: doc.id,
          name: data.name || '',
          rating: data.rating || 5,
          quote: data.quote || '',
          featured: data.featured || false,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        })
      })
      
      setTestimonials(testimonialsData)
    } catch (error) {
      console.error('Error fetching testimonials:', error)
    }
  }

  const handleTestimonialInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setTestimonialFormData((prev) => ({
      ...prev,
      [name]: name === 'rating' ? Number(value) : value,
    }))
  }

  const handleTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const now = new Date().toISOString()
      const testimonialData: any = {
        name: testimonialFormData.name || '',
        rating: testimonialFormData.rating || 5,
        quote: testimonialFormData.quote || '',
        featured: testimonialFormData.featured || false,
        updatedAt: now,
      }

      if (!editingTestimonial?.id) {
        testimonialData.createdAt = now
      }

      const dbInstance = getDbInstance()
      if (editingTestimonial?.id) {
        await updateDoc(doc(dbInstance, 'testimonials', editingTestimonial.id), testimonialData)
      } else {
        await addDoc(collection(dbInstance, 'testimonials'), testimonialData)
      }

      setShowTestimonialForm(false)
      setEditingTestimonial(null)
      setTestimonialFormData({})
      fetchTestimonials()
    } catch (error) {
      console.error('Error saving testimonial:', error)
      alert('Error saving testimonial. Please try again.')
    }
  }

  const handleEditTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial)
    setTestimonialFormData(testimonial)
    setShowTestimonialForm(true)
    setActiveTab('testimonials')
  }

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return
    try {
      const dbInstance = getDbInstance()
      await deleteDoc(doc(dbInstance, 'testimonials', id))
      fetchTestimonials()
    } catch (error) {
      console.error('Error deleting testimonial:', error)
      alert('Error deleting testimonial. Please try again.')
    }
  }

  const handleNewTestimonial = () => {
    setEditingTestimonial(null)
    setTestimonialFormData({})
    setShowTestimonialForm(true)
    setActiveTab('testimonials')
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

      // Build package data, excluding undefined values
      const packageData: any = {
        ...formData,
        Last_Updated: new Date().toISOString().split('T')[0],
        Created_By: currentUser?.email || 'Admin',
      }

      // Handle Price_Min_INR - only include if it has a valid value
      const minPriceValue = formData.Price_Min_INR
      if (minPriceValue !== undefined && minPriceValue !== null) {
        const minValueStr = String(minPriceValue).trim()
        if (minValueStr !== '' && !isNaN(Number(minValueStr)) && Number(minValueStr) >= 0) {
          packageData.Price_Min_INR = Number(minValueStr)
        } else if (editingPackage?.id) {
          // If editing and value is empty or invalid, remove the field
          packageData.Price_Min_INR = deleteField()
        }
      } else if (editingPackage?.id) {
        // If editing and value is empty, remove the field
        packageData.Price_Min_INR = deleteField()
      }

      // Handle Price_Max_INR - only include if it has a valid value
      const maxPriceValue = formData.Price_Max_INR
      if (maxPriceValue !== undefined && maxPriceValue !== null) {
        const maxValueStr = String(maxPriceValue).trim()
        if (maxValueStr !== '' && !isNaN(Number(maxValueStr)) && Number(maxValueStr) >= 0) {
          packageData.Price_Max_INR = Number(maxValueStr)
        } else if (editingPackage?.id) {
          // If editing and value is empty or invalid, remove the field
          packageData.Price_Max_INR = deleteField()
        }
      } else if (editingPackage?.id) {
        // If editing and value is empty, remove the field
        packageData.Price_Max_INR = deleteField()
      }

      // Remove any undefined values from packageData (Firestore doesn't accept undefined)
      Object.keys(packageData).forEach(key => {
        if (packageData[key] === undefined) {
          delete packageData[key]
        }
      })

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
      // Parse blogStructure if it's a string
      let blogStructure: BlogSection[] | undefined = undefined
      const blogStructureValue = blogFormData.blogStructure
      
      if (blogStructureValue) {
        if (typeof blogStructureValue === 'string') {
          const trimmed = blogStructureValue.trim()
          if (trimmed) {
            try {
              blogStructure = JSON.parse(trimmed) as BlogSection[]
            } catch {
              // If parsing fails, leave as undefined
              blogStructure = undefined
            }
          }
        } else if (Array.isArray(blogStructureValue)) {
          blogStructure = blogStructureValue
        }
      }

      // Helper function to remove undefined values
      const removeUndefined = (obj: any): any => {
        const cleaned: any = {}
        for (const key in obj) {
          if (obj[key] !== undefined && obj[key] !== null) {
            cleaned[key] = obj[key]
          }
        }
        return cleaned
      }

      const blogData: any = {
        title: blogFormData.title || '',
        subtitle: blogFormData.subtitle || '',
        description: blogFormData.description || '',
        content: blogFormData.content || '',
        image: blogFormData.image || '',
        author: blogFormData.author || currentUser?.email?.split('@')[0] || 'Admin',
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
        schemaType: blogFormData.schemaType || 'BlogPosting',
      }

      // Only include optional fields if they have values
      if (blogStructure) {
        blogData.blogStructure = blogStructure
      }
      
      if (blogFormData.authorImage) {
        blogData.authorImage = blogFormData.authorImage
      }

      // SEO Fields - only include if they have values
      if (blogFormData.metaTitle && blogFormData.metaTitle.trim()) {
        blogData.metaTitle = blogFormData.metaTitle.trim()
      }
      
      if (blogFormData.metaDescription && blogFormData.metaDescription.trim()) {
        blogData.metaDescription = blogFormData.metaDescription.trim()
      }
      
      if (blogFormData.keywords && Array.isArray(blogFormData.keywords) && blogFormData.keywords.length > 0) {
        blogData.keywords = blogFormData.keywords.filter(k => k && k.trim())
      }
      
      if (blogFormData.canonicalUrl && blogFormData.canonicalUrl.trim()) {
        blogData.canonicalUrl = blogFormData.canonicalUrl.trim()
      }
      
      if (blogFormData.ogImage && blogFormData.ogImage.trim()) {
        blogData.ogImage = blogFormData.ogImage.trim()
      }

      // Remove any remaining undefined values before saving
      const cleanedBlogData = removeUndefined(blogData)

      const dbInstance = getDbInstance()
      if (editingBlog?.id) {
        await updateDoc(doc(dbInstance, 'blogs', editingBlog.id), cleanedBlogData)
      } else {
        await addDoc(collection(dbInstance, 'blogs'), cleanedBlogData)
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
    // Ensure number fields are properly converted (handle both string and number types from Firestore)
    const formattedData: Partial<DestinationPackage> = {
      ...pkg,
      // Convert number fields from string to number if needed
      Price_Min_INR: pkg.Price_Min_INR !== undefined && pkg.Price_Min_INR !== null 
        ? (typeof pkg.Price_Min_INR === 'string' ? Number(pkg.Price_Min_INR) : pkg.Price_Min_INR)
        : undefined,
      Price_Max_INR: pkg.Price_Max_INR !== undefined && pkg.Price_Max_INR !== null
        ? (typeof pkg.Price_Max_INR === 'string' ? Number(pkg.Price_Max_INR) : pkg.Price_Max_INR)
        : undefined,
      Duration_Nights: pkg.Duration_Nights !== undefined && pkg.Duration_Nights !== null
        ? (typeof pkg.Duration_Nights === 'string' ? Number(pkg.Duration_Nights) : pkg.Duration_Nights)
        : undefined,
      Duration_Days: pkg.Duration_Days !== undefined && pkg.Duration_Days !== null
        ? (typeof pkg.Duration_Days === 'string' ? Number(pkg.Duration_Days) : pkg.Duration_Days)
        : undefined,
      // Trim string fields to remove any whitespace that might cause dropdown mismatches
      Mood: typeof pkg.Mood === 'string' ? pkg.Mood.trim() : pkg.Mood,
      Travel_Type: typeof pkg.Travel_Type === 'string' ? pkg.Travel_Type.trim() : pkg.Travel_Type,
      Adventure_Level: typeof pkg.Adventure_Level === 'string' ? pkg.Adventure_Level.trim() : pkg.Adventure_Level,
      Budget_Category: typeof pkg.Budget_Category === 'string' ? pkg.Budget_Category.trim() : pkg.Budget_Category,
      Star_Category: typeof pkg.Star_Category === 'string' ? pkg.Star_Category.trim() : pkg.Star_Category,
      Child_Friendly: typeof pkg.Child_Friendly === 'string' ? pkg.Child_Friendly.trim() : pkg.Child_Friendly,
      Elderly_Friendly: typeof pkg.Elderly_Friendly === 'string' ? pkg.Elderly_Friendly.trim() : pkg.Elderly_Friendly,
    }
    setFormData(formattedData)
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
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
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

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all">
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

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all">
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

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all">
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

        {/* Navigation Tabs - Modern Grid Layout */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                activeTab === 'dashboard'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'dashboard' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'dashboard' ? 'text-primary' : 'text-gray-700'}`}>
                  Dashboard
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('packages')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                activeTab === 'packages'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'packages' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'packages' ? 'text-primary' : 'text-gray-700'}`}>
                  Packages
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{packages.length}</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('blogs')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                activeTab === 'blogs'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'blogs' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'blogs' ? 'text-primary' : 'text-gray-700'}`}>
                  Blogs
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{blogs.length}</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('destinations')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                activeTab === 'destinations'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'destinations' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'destinations' ? 'text-primary' : 'text-gray-700'}`}>
                  Destinations
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{destinations.length}</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                activeTab === 'users'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'users' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'users' ? 'text-primary' : 'text-gray-700'}`}>
                  Users
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{users.length}</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                activeTab === 'leads'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'leads' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'leads' ? 'text-primary' : 'text-gray-700'}`}>
                  Leads
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{leads.length}</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                activeTab === 'contacts'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'contacts' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'contacts' ? 'text-primary' : 'text-gray-700'}`}>
                  Contact
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{contactMessages.length}</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('subscribers')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                activeTab === 'subscribers'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'subscribers' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'subscribers' ? 'text-primary' : 'text-gray-700'}`}>
                  Newsletter
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{subscribers.length}</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('careers')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                activeTab === 'careers'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'careers' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-5.196 0-8.07-.745-9-1.745M21 13.255v-2.51A23.931 23.931 0 0112 8c-5.196 0-8.07.745-9 1.745m18 0v6.51A23.931 23.931 0 0112 21c-5.196 0-8.07-.745-9-1.745m0 0v-6.51M3 13.255A23.931 23.931 0 0112 15c5.196 0 8.07-.745 9-1.745" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'careers' ? 'text-primary' : 'text-gray-700'}`}>
                  Careers
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{jobApplications.length}</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('testimonials')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                activeTab === 'testimonials'
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activeTab === 'testimonials' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'testimonials' ? 'text-primary' : 'text-gray-700'}`}>
                  Testimonials
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{testimonials.length}</div>
              </div>
            </button>
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
                  setFormData={setFormData}
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
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex justify-between items-center">
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
                              className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold transition-colors"
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
                      <p className="text-xs text-gray-500 mt-1">Basic content (fallback if blog structure is not provided)</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Blog Structure (JSON) - Best User Experience Format
                      </label>
                      <textarea
                        name="blogStructure"
                        value={typeof blogFormData.blogStructure === 'string' ? blogFormData.blogStructure : JSON.stringify(blogFormData.blogStructure || [], null, 2)}
                        onChange={handleBlogInputChange}
                        rows={20}
                        placeholder={`Example - Best Blog Structure:
[
  {
    "type": "intro",
    "text": "Traveling solo can be one of the most rewarding experiences. It teaches you independence, helps you discover yourself, and allows you to travel at your own pace."
  },
  {
    "type": "heading",
    "text": "Why Solo Travel is Life-Changing"
  },
  {
    "type": "paragraph",
    "text": "When you travel alone, every decision is yours. You wake up when you want, eat where you want, and explore at your own rhythm. This freedom is liberating and helps you understand yourself better."
  },
  {
    "type": "image",
    "imageUrl": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
    "imageAlt": "Solo traveler exploring a beautiful destination"
  },
  {
    "type": "subheading",
    "text": "Top Benefits of Solo Travel"
  },
  {
    "type": "list",
    "items": [
      "Complete freedom to plan your itinerary",
      "Opportunity to meet new people and make friends",
      "Personal growth and self-discovery",
      "Flexibility to change plans on a whim",
      "Time for reflection and mindfulness"
    ]
  },
  {
    "type": "quote",
    "text": "Traveling solo does not mean traveling alone. It means being open to meeting new people and having new experiences.",
    "author": "Travel Expert"
  },
  {
    "type": "heading",
    "text": "Essential Tips for First-Time Solo Travelers"
  },
  {
    "type": "paragraph",
    "text": "Start with a destination that feels safe and familiar. Research your accommodation options, learn basic phrases in the local language, and always keep someone informed about your itinerary."
  },
  {
    "type": "divider"
  },
  {
    "type": "faq",
    "faqs": [
      {
        "question": "Is solo travel safe?",
        "answer": "Yes, with proper planning and awareness, solo travel can be very safe. Always research your destination, stay in reputable accommodations, and keep someone informed of your itinerary."
      },
      {
        "question": "How do I meet people while traveling solo?",
        "answer": "Stay in hostels, join group tours, use social travel apps, attend local events, and be open to conversations with locals and fellow travelers."
      }
    ]
  },
  {
    "type": "toc"
  },
  {
    "type": "related",
    "relatedLinks": [
      {
        "title": "Best Destinations for Solo Travelers",
        "url": "/destinations",
        "description": "Discover destinations perfect for solo adventures"
      },
      {
        "title": "Solo Travel Safety Guide",
        "url": "/blog/safety-guide",
        "description": "Essential safety tips for solo travelers"
      }
    ]
  },
  {
    "type": "cta",
    "text": "Ready to start your solo adventure? Explore our curated travel packages designed for independent travelers.",
    "link": "/destinations",
    "linkText": "Browse Destinations"
  }
]`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter JSON array of sections. Types: intro, paragraph, heading, subheading, image, quote, list, cta, divider, faq, toc, related
                      </p>
                    </div>
                    
                    {/* SEO Section */}
                    <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">SEO Optimization</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Meta Title (for SEO) - Leave empty to use blog title
                          </label>
                          <input
                            type="text"
                            name="metaTitle"
                            value={blogFormData.metaTitle || ''}
                            onChange={handleBlogInputChange}
                            placeholder="Optimized title for search engines (50-60 characters)"
                            maxLength={60}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {blogFormData.metaTitle?.length || 0}/60 characters
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Meta Description (for SEO) - Leave empty to use blog description
                          </label>
                          <textarea
                            name="metaDescription"
                            value={blogFormData.metaDescription || ''}
                            onChange={handleBlogInputChange}
                            placeholder="Optimized description for search engines (150-160 characters)"
                            maxLength={160}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {blogFormData.metaDescription?.length || 0}/160 characters
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Keywords (comma-separated)
                          </label>
                          <input
                            type="text"
                            name="keywords"
                            value={Array.isArray(blogFormData.keywords) ? blogFormData.keywords.join(', ') : (typeof blogFormData.keywords === 'string' ? blogFormData.keywords : '')}
                            onChange={(e) => {
                              const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k)
                              setBlogFormData((prev) => ({
                                ...prev,
                                keywords: keywords,
                              }))
                            }}
                            placeholder="travel, solo travel, adventure, tips"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Canonical URL (optional)
                            </label>
                            <input
                              type="url"
                              name="canonicalUrl"
                              value={blogFormData.canonicalUrl || ''}
                              onChange={handleBlogInputChange}
                              placeholder="https://travelzada.com/blog/post"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              OG Image URL (for social sharing) - Leave empty to use main image
                            </label>
                            <input
                              type="url"
                              name="ogImage"
                              value={blogFormData.ogImage || ''}
                              onChange={handleBlogInputChange}
                              placeholder="https://images.unsplash.com/..."
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Schema Type (for structured data)
                          </label>
                          <select
                            name="schemaType"
                            value={blogFormData.schemaType || 'BlogPosting'}
                            onChange={handleBlogInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="BlogPosting">BlogPosting</option>
                            <option value="Article">Article</option>
                            <option value="NewsArticle">NewsArticle</option>
                          </select>
                        </div>
                      </div>
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
                              className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold transition-colors"
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

        {/* Destinations Tab */}
        {activeTab === 'destinations' && (
          <div className="space-y-6">
            {showDestinationForm && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingDestination ? 'Edit Destination' : 'Create New Destination'}
                </h2>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    const destinationData: any = {
                      name: destinationFormData.name || '',
                      country: destinationFormData.country || '',
                      description: destinationFormData.description || '',
                      image: destinationFormData.image || '',
                      slug: destinationFormData.slug || (destinationFormData.name?.toLowerCase().replace(/\s+/g, '-') || ''),
                      featured: destinationFormData.featured || false,
                      packageIds: destinationFormData.packageIds || [],
                      bestTimeToVisit: destinationFormData.bestTimeToVisit || '',
                      duration: destinationFormData.duration || '',
                      currency: destinationFormData.currency || '',
                      language: destinationFormData.language || '',
                      highlights: destinationFormData.highlights || [],
                      activities: destinationFormData.activities || [],
                      budgetRange: destinationFormData.budgetRange || {},
                      hotelTypes: destinationFormData.hotelTypes || [],
                      updatedAt: new Date().toISOString(),
                    }
                    if (!editingDestination?.id) {
                      destinationData.createdAt = new Date().toISOString()
                    }

                    const dbInstance = getDbInstance()
                    if (editingDestination?.id) {
                      await updateDoc(doc(dbInstance, 'destinations', editingDestination.id), destinationData)
                    } else {
                      await addDoc(collection(dbInstance, 'destinations'), destinationData)
                    }

                    setShowDestinationForm(false)
                    setEditingDestination(null)
                    setDestinationFormData({})
                    setPackageIdsInput('')
                    fetchDestinations()
                  } catch (error) {
                    console.error('Error saving destination:', error)
                    alert('Error saving destination. Please try again.')
                  }
                }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={destinationFormData.name || ''}
                        onChange={(e) => setDestinationFormData({ ...destinationFormData, name: e.target.value })}
                        required
                        placeholder="Bali"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Country *</label>
                      <input
                        type="text"
                        value={destinationFormData.country || ''}
                        onChange={(e) => setDestinationFormData({ ...destinationFormData, country: e.target.value })}
                        required
                        placeholder="Indonesia"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                      <textarea
                        value={destinationFormData.description || ''}
                        onChange={(e) => setDestinationFormData({ ...destinationFormData, description: e.target.value })}
                        required
                        rows={3}
                        placeholder="A beautiful tropical destination..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL *</label>
                      <input
                        type="url"
                        value={destinationFormData.image || ''}
                        onChange={(e) => setDestinationFormData({ ...destinationFormData, image: e.target.value })}
                        required
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Slug *</label>
                      <input
                        type="text"
                        value={destinationFormData.slug || (destinationFormData.name?.toLowerCase().replace(/\s+/g, '-') || '')}
                        onChange={(e) => setDestinationFormData({ ...destinationFormData, slug: e.target.value })}
                        required
                        placeholder="bali"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Linked Package IDs (comma-separated)</label>
                      <input
                        type="text"
                        value={packageIdsInput}
                        onChange={(e) => {
                          // Store raw input value - allow user to type freely including commas
                          const inputValue = e.target.value
                          setPackageIdsInput(inputValue)
                          // Parse IDs only when there's actual content (not just a trailing comma)
                          // This allows typing commas without losing them
                          if (inputValue.trim()) {
                            const ids = inputValue
                              .split(',')
                              .map(id => id.trim())
                              .filter(id => id) // Only filter empty strings, not trailing commas
                            setDestinationFormData({ ...destinationFormData, packageIds: ids })
                          } else {
                            setDestinationFormData({ ...destinationFormData, packageIds: [] })
                          }
                        }}
                        onBlur={(e) => {
                          // When user leaves the field, clean up and finalize
                          const inputValue = e.target.value.trim().replace(/,\s*$/, '') // Remove trailing comma
                          setPackageIdsInput(inputValue)
                          const ids = inputValue.split(',').map(id => id.trim()).filter(id => id)
                          setDestinationFormData({ ...destinationFormData, packageIds: ids })
                        }}
                        placeholder="DEST_BALI_001, DEST_BALI_002, DEST_BALI_003"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter Destination_IDs separated by commas (e.g., DEST_BALI_001, DEST_BALI_002)</p>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={destinationFormData.featured || false}
                          onChange={(e) => setDestinationFormData({ ...destinationFormData, featured: e.target.checked })}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm font-semibold text-gray-700">Featured</span>
                      </label>
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Additional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Best Time to Visit</label>
                        <input
                          type="text"
                          value={destinationFormData.bestTimeToVisit || ''}
                          onChange={(e) => setDestinationFormData({ ...destinationFormData, bestTimeToVisit: e.target.value })}
                          placeholder="April to October (dry season)"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Recommended Duration</label>
                        <input
                          type="text"
                          value={destinationFormData.duration || ''}
                          onChange={(e) => setDestinationFormData({ ...destinationFormData, duration: e.target.value })}
                          placeholder="5-7 days recommended"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
                        <input
                          type="text"
                          value={destinationFormData.currency || ''}
                          onChange={(e) => setDestinationFormData({ ...destinationFormData, currency: e.target.value })}
                          placeholder="Indonesian Rupiah (IDR)"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
                        <input
                          type="text"
                          value={destinationFormData.language || ''}
                          onChange={(e) => setDestinationFormData({ ...destinationFormData, language: e.target.value })}
                          placeholder="Indonesian, Balinese"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Highlights (JSON Array)</label>
                        <textarea
                          value={destinationFormData.highlights ? JSON.stringify(destinationFormData.highlights, null, 2) : ''}
                          onChange={(e) => {
                            try {
                              const parsed = e.target.value ? JSON.parse(e.target.value) : []
                              setDestinationFormData({ ...destinationFormData, highlights: parsed })
                            } catch {
                              // Invalid JSON
                            }
                          }}
                          rows={4}
                          placeholder={`[\n  "Ubud rice terraces",\n  "Tanah Lot Temple",\n  "Seminyak Beach"\n]`}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter as JSON array of strings</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Activities (JSON Array)</label>
                        <textarea
                          value={destinationFormData.activities ? JSON.stringify(destinationFormData.activities, null, 2) : ''}
                          onChange={(e) => {
                            try {
                              const parsed = e.target.value ? JSON.parse(e.target.value) : []
                              setDestinationFormData({ ...destinationFormData, activities: parsed })
                            } catch {
                              // Invalid JSON
                            }
                          }}
                          rows={4}
                          placeholder={`[\n  "Beach relaxation",\n  "Temple visits",\n  "Water sports"\n]`}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter as JSON array of strings</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Budget Range (JSON Object)</label>
                        <textarea
                          value={destinationFormData.budgetRange ? JSON.stringify(destinationFormData.budgetRange, null, 2) : ''}
                          onChange={(e) => {
                            try {
                              const parsed = e.target.value ? JSON.parse(e.target.value) : {}
                              setDestinationFormData({ ...destinationFormData, budgetRange: parsed })
                            } catch {
                              // Invalid JSON
                            }
                          }}
                          rows={5}
                          placeholder={`{\n  "budget": "₹30,000 - ₹50,000",\n  "midRange": "₹50,000 - ₹80,000",\n  "luxury": "₹80,000+"\n}`}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter as JSON object with budget, midRange, and luxury fields</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Hotel Types (JSON Array)</label>
                        <textarea
                          value={destinationFormData.hotelTypes ? JSON.stringify(destinationFormData.hotelTypes, null, 2) : ''}
                          onChange={(e) => {
                            try {
                              const parsed = e.target.value ? JSON.parse(e.target.value) : []
                              setDestinationFormData({ ...destinationFormData, hotelTypes: parsed })
                            } catch {
                              // Invalid JSON
                            }
                          }}
                          rows={3}
                          placeholder={`[\n  "Beach resorts",\n  "Villa rentals",\n  "Boutique hotels"\n]`}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter as JSON array of strings</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                    >
                      {editingDestination ? 'Update Destination' : 'Create Destination'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDestinationForm(false)
                        setEditingDestination(null)
                        setDestinationFormData({})
                        setPackageIdsInput('')
                      }}
                      className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!showDestinationForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">All Destinations</h2>
                  <button
                    onClick={() => {
                      setEditingDestination(null)
                      setDestinationFormData({})
                      setPackageIdsInput('')
                      setShowDestinationForm(true)
                    }}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
                  >
                    + Add New
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Packages</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {destinations.map((dest) => (
                        <tr key={dest.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{dest.name}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{dest.country}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{dest.slug}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {dest.packageIds?.length || 0} package(s)
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                setEditingDestination(dest)
                                setDestinationFormData(dest)
                                setPackageIdsInput(dest.packageIds?.join(', ') || '')
                                setShowDestinationForm(true)
                              }}
                              className="text-primary hover:text-primary-dark mr-4 text-sm font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('Are you sure you want to delete this destination?')) return
                                try {
                                  const dbInstance = getDbInstance()
                                  await deleteDoc(doc(dbInstance, 'destinations', dest.id!))
                                  fetchDestinations()
                                } catch (error) {
                                  console.error('Error deleting destination:', error)
                                  alert('Error deleting destination. Please try again.')
                                }
                              }}
                              className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {destinations.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No destinations found</div>
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

        {/* Newsletter Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Newsletter Subscribers ({subscribers.length})</h2>
                <button
                  onClick={fetchSubscribers}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscribed Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {subscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{subscriber.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            subscriber.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {subscriber.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {subscriber.source || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {subscriber.subscribedAt 
                            ? new Date(subscriber.subscribedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to delete ${subscriber.email}?`)) return
                              try {
                                const dbInstance = getDbInstance()
                                if (subscriber.id) {
                                  await deleteDoc(doc(dbInstance, 'newsletter_subscribers', subscriber.id))
                                  fetchSubscribers()
                                  alert('Subscriber deleted successfully!')
                                }
                              } catch (error) {
                                console.error('Error deleting subscriber:', error)
                                alert('Error deleting subscriber. Please try again.')
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {subscribers.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500 mb-4">No newsletter subscribers yet</div>
                    <div className="text-sm text-gray-400">
                      Subscribers will appear here when they sign up through the blog page newsletter form.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contact Messages Tab */}
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Contact Messages ({contactMessages.length})</h2>
                <button
                  onClick={fetchContactMessages}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {contactMessages.map((message) => (
                      <tr 
                        key={message.id} 
                        className={`hover:bg-gray-50 transition-colors ${!message.read ? 'bg-blue-50/50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{message.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{message.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {message.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={message.subject}>
                            {message.subject}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            message.status === 'new' 
                              ? 'bg-blue-100 text-blue-800' 
                              : message.status === 'read'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {message.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {message.createdAt 
                            ? new Date(message.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setViewModal({
                                  isOpen: true,
                                  title: `Contact Message from ${message.name}`,
                                  content: (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Name</p>
                                          <p className="text-gray-900">{message.name}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Email</p>
                                          <a href={`mailto:${message.email}`} className="text-primary hover:underline">{message.email}</a>
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Phone</p>
                                          <a href={`tel:${message.phone}`} className="text-primary hover:underline">{message.phone || 'N/A'}</a>
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Date</p>
                                          <p className="text-gray-900">{new Date(message.createdAt).toLocaleString()}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-500 mb-1">Subject</p>
                                        <p className="text-gray-900 font-medium">{message.subject}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-500 mb-1">Message</p>
                                        <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200">{message.message}</p>
                                      </div>
                                    </div>
                                  ),
                                })
                                
                                // Mark as read
                                if (message.id && !message.read) {
                                  const dbInstance = getDbInstance()
                                  updateDoc(doc(dbInstance, 'contact_messages', message.id), {
                                    read: true,
                                    status: 'read',
                                  }).then(() => {
                                    fetchContactMessages()
                                  }).catch((error) => {
                                    console.error('Error updating message:', error)
                                  })
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-semibold transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to delete this message from ${message.name}?`)) return
                                try {
                                  const dbInstance = getDbInstance()
                                  if (message.id) {
                                    await deleteDoc(doc(dbInstance, 'contact_messages', message.id))
                                    fetchContactMessages()
                                    alert('Message deleted successfully!')
                                  }
                                } catch (error) {
                                  console.error('Error deleting message:', error)
                                  alert('Error deleting message. Please try again.')
                                }
                              }}
                              className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {contactMessages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500 mb-4">No contact messages yet</div>
                    <div className="text-sm text-gray-400">
                      Messages will appear here when users submit the contact form.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Leads ({leads.length})</h2>
                <button
                  onClick={fetchLeads}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source URL</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className={`hover:bg-gray-50 ${!lead.read ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{lead.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{lead.mobile}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{lead.packageName || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <a 
                            href={lead.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-semibold truncate max-w-xs block"
                            title={lead.sourceUrl}
                          >
                            {lead.sourceUrl.length > 50 ? `${lead.sourceUrl.substring(0, 50)}...` : lead.sourceUrl}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            lead.status === 'new' ? 'bg-green-100 text-green-800' :
                            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'converted' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {new Date(lead.createdAt).toLocaleDateString()} {new Date(lead.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setViewModal({
                                  isOpen: true,
                                  title: `Lead from ${lead.name}`,
                                  content: (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Name</p>
                                          <p className="text-gray-900">{lead.name}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Mobile</p>
                                          <a href={`tel:${lead.mobile}`} className="text-primary hover:underline">{lead.mobile}</a>
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Package</p>
                                          <p className="text-gray-900">{lead.packageName || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Status</p>
                                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                            lead.status === 'new' ? 'bg-green-100 text-green-800' :
                                            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                            lead.status === 'converted' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {lead.status}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Date</p>
                                          <p className="text-gray-900">{new Date(lead.createdAt).toLocaleString()}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-500 mb-1">Source URL</p>
                                        <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                                          {lead.sourceUrl}
                                        </a>
                                      </div>
                                    </div>
                                  ),
                                })
                                
                                // Mark as read
                                if (lead.id && !lead.read) {
                                  const dbInstance = getDbInstance()
                                  updateDoc(doc(dbInstance, 'leads', lead.id), {
                                    read: true,
                                    status: lead.status === 'new' ? 'contacted' : lead.status,
                                  }).then(() => {
                                    fetchLeads()
                                  }).catch((error) => {
                                    console.error('Error updating lead:', error)
                                  })
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-semibold transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={async () => {
                                if (lead.id) {
                                  try {
                                    const dbInstance = getDbInstance()
                                    await updateDoc(doc(dbInstance, 'leads', lead.id), {
                                      status: lead.status === 'new' ? 'contacted' : lead.status === 'contacted' ? 'converted' : 'new',
                                    })
                                    fetchLeads()
                                  } catch (error) {
                                    console.error('Error updating lead status:', error)
                                    alert('Error updating lead status. Please try again.')
                                  }
                                }
                              }}
                              className="text-green-600 hover:text-green-800 text-sm font-semibold"
                            >
                              {lead.status === 'new' ? 'Mark Contacted' : lead.status === 'contacted' ? 'Mark Converted' : 'Reset'}
                            </button>
                            <button
                              onClick={async () => {
                                if (lead.id && confirm('Are you sure you want to delete this lead?')) {
                                  try {
                                    const dbInstance = getDbInstance()
                                    await deleteDoc(doc(dbInstance, 'leads', lead.id))
                                    fetchLeads()
                                    alert('Lead deleted successfully!')
                                  } catch (error) {
                                    console.error('Error deleting lead:', error)
                                    alert('Error deleting lead. Please try again.')
                                  }
                                }
                              }}
                              className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leads.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500 mb-4">No leads yet</div>
                    <div className="text-sm text-gray-400">
                      Leads will appear here when users submit the enquiry form.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Job Applications Tab */}
        {activeTab === 'careers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Job Applications ({jobApplications.length})</h2>
                <button
                  onClick={fetchJobApplications}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LinkedIn</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {jobApplications.map((application) => (
                      <tr 
                        key={application.id} 
                        className={`hover:bg-gray-50 ${!application.read ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{application.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{application.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">{application.position}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {application.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          {application.linkedin ? (
                            <a 
                              href={application.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                            >
                              View Profile
                            </a>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            application.status === 'new' 
                              ? 'bg-blue-100 text-blue-800' 
                              : application.status === 'read'
                              ? 'bg-gray-100 text-gray-800'
                              : application.status === 'reviewed'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {application.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {application.createdAt 
                            ? new Date(application.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setViewModal({
                                  isOpen: true,
                                  title: `Job Application from ${application.name}`,
                                  content: (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Name</p>
                                          <p className="text-gray-900">{application.name}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Email</p>
                                          <a href={`mailto:${application.email}`} className="text-primary hover:underline">{application.email}</a>
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Phone</p>
                                          <a href={`tel:${application.phone}`} className="text-primary hover:underline">{application.phone || 'N/A'}</a>
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Position</p>
                                          <p className="text-gray-900 font-medium">{application.position}</p>
                                        </div>
                                        {application.linkedin && (
                                          <div className="col-span-2">
                                            <p className="text-sm font-semibold text-gray-500 mb-1">LinkedIn</p>
                                            <a href={application.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                                              {application.linkedin}
                                            </a>
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Date</p>
                                          <p className="text-gray-900">{new Date(application.createdAt).toLocaleString()}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-500 mb-1">Cover Letter</p>
                                        <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200">{application.coverLetter}</p>
                                      </div>
                                    </div>
                                  ),
                                })
                                
                                // Mark as read
                                if (application.id && !application.read) {
                                  const dbInstance = getDbInstance()
                                  updateDoc(doc(dbInstance, 'job_applications', application.id), {
                                    read: true,
                                    status: 'read',
                                  }).then(() => {
                                    fetchJobApplications()
                                  }).catch((error) => {
                                    console.error('Error updating application:', error)
                                  })
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-semibold transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to delete this application from ${application.name}?`)) return
                                try {
                                  const dbInstance = getDbInstance()
                                  if (application.id) {
                                    await deleteDoc(doc(dbInstance, 'job_applications', application.id))
                                    fetchJobApplications()
                                    alert('Application deleted successfully!')
                                  }
                                } catch (error) {
                                  console.error('Error deleting application:', error)
                                  alert('Error deleting application. Please try again.')
                                }
                              }}
                              className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-semibold transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {jobApplications.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500 mb-4">No job applications yet</div>
                    <div className="text-sm text-gray-400">
                      Applications will appear here when candidates apply through the careers page.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Testimonials Tab */}
        {activeTab === 'testimonials' && (
          <div className="space-y-6">
            {showTestimonialForm && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingTestimonial ? 'Edit Testimonial' : 'Create New Testimonial'}
                </h2>
                <form onSubmit={handleTestimonialSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={testimonialFormData.name || ''}
                      onChange={handleTestimonialInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rating *</label>
                    <select
                      name="rating"
                      value={testimonialFormData.rating || 5}
                      onChange={handleTestimonialInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value={5}>5 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={2}>2 Stars</option>
                      <option value={1}>1 Star</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quote/Review *</label>
                    <textarea
                      name="quote"
                      value={testimonialFormData.quote || ''}
                      onChange={handleTestimonialInputChange}
                      required
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={testimonialFormData.featured || false}
                      onChange={(e) => setTestimonialFormData(prev => ({ ...prev, featured: e.target.checked }))}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label className="text-sm font-semibold text-gray-700">Featured</label>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                    >
                      {editingTestimonial ? 'Update Testimonial' : 'Create Testimonial'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTestimonialForm(false)
                        setEditingTestimonial(null)
                        setTestimonialFormData({})
                      }}
                      className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            {!showTestimonialForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">All Testimonials</h2>
                  <button
                    onClick={handleNewTestimonial}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
                  >
                    + New Testimonial
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Featured</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {testimonials.map((testimonial) => (
                        <tr key={testimonial.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{testimonial.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              {[...Array(testimonial.rating)].map((_, i) => (
                                <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-md truncate">{testimonial.quote}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              testimonial.featured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {testimonial.featured ? 'Featured' : 'Regular'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditTestimonial(testimonial)}
                                className="text-primary hover:text-primary-dark text-sm font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTestimonial(testimonial.id!)}
                                className="text-red-600 hover:text-red-800 text-sm font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {testimonials.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No testimonials found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />

      {/* View Modal */}
      <ViewModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, title: '', content: null })}
        title={viewModal.title}
      >
        {viewModal.content}
      </ViewModal>
    </main>
  )
}
