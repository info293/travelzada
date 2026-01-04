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
import AIPackageGenerator from '@/components/admin/AIPackageGenerator'
import ItineraryGenerator from '@/components/admin/ItineraryGenerator'
import CustomerRecordsManager from '@/components/admin/CustomerRecordsManager'
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
  Highlights?: string[]
  Day_Wise_Itinerary_Details?: Array<{
    day: number
    title: string
    description: string
    activities: string[]
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
  sectionHeader?: string // Section title like "Politics", "Sports", "SBSQ"
  isFeatured?: boolean // Featured post for the section (shown on left with large image)
  sectionOrder?: number // Order within the section
  readTime?: string
  likes?: number
  views?: number
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
  slug?: string // Custom URL slug
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

type TabType = 'packages' | 'blogs' | 'users' | 'destinations' | 'subscribers' | 'contacts' | 'leads' | 'careers' | 'testimonials' | 'dashboard' | 'ai-generator' | 'create-itinerary' | 'customer-records'

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
  rating?: number // Rating from 4.0 to 5.0
  createdAt?: string
  updatedAt?: string
}

interface Lead {
  id?: string
  name: string
  mobile: string
  sourceUrl: string
  packageName: string
  status: string
  createdAt: any
  read: boolean
  email?: string
  destination?: string
  travelDate?: string
  travelersCount?: number
  travelType?: string
  budget?: string
  notes?: string
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
  const [contactMessages, setContactMessages] = useState<Array<{ id?: string; name: string; email: string; phone: string; destination: string; message: string; status: string; createdAt: any; read: boolean }>>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isLeadDetailsModalOpen, setLeadDetailsModalOpen] = useState(false)
  const [leadDetailsForm, setLeadDetailsForm] = useState({
    email: '',
    destination: '',
    travelDate: '',
    travelersCount: '',
    travelType: '',
    budget: '',
    notes: '',
  })
  const [leadDetailsError, setLeadDetailsError] = useState<string | null>(null)
  const [isLeadDetailsSaving, setIsLeadDetailsSaving] = useState(false)
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
  const [keywordsInput, setKeywordsInput] = useState<string>('')
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
  const [showBlogBulkImport, setShowBlogBulkImport] = useState(false)
  const [blogBulkImportJson, setBlogBulkImportJson] = useState('')
  const [blogBulkImportStatus, setBlogBulkImportStatus] = useState<{
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

  // Sorting and Filtering State
  type SortDirection = 'asc' | 'desc'
  interface SortConfig {
    key: string
    direction: SortDirection
  }

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' })
  const [filterText, setFilterText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Reset sort and filter when tab changes
  useEffect(() => {
    setFilterText('')
    setStatusFilter('all')
    setSortConfig({ key: 'createdAt', direction: 'desc' })
  }, [activeTab])

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const getSortedAndFilteredData = <T extends any>(
    data: T[],
    searchFields: (keyof T)[],
    statusField?: keyof T
  ) => {
    return data
      .filter((item) => {
        // Status Filter
        if (statusFilter !== 'all' && statusField) {
          const itemStatus = String(item[statusField] || '').toLowerCase()
          if (itemStatus !== statusFilter.toLowerCase()) return false
        }

        // Text Search
        if (!filterText) return true
        const searchText = filterText.toLowerCase()
        return searchFields.some((field) => {
          const value = String(item[field] || '').toLowerCase()
          return value.includes(searchText)
        })
      })
      .sort((a, b) => {
        const aValue = a[sortConfig.key as keyof T]
        const bValue = b[sortConfig.key as keyof T]

        if (!aValue && !bValue) return 0
        if (!aValue) return 1
        if (!bValue) return -1

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
  }

  // Helper to render sort arrow
  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <span className="inline-block w-4" />
    return (
      <span className="inline-block ml-1">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

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

      const messagesData: Array<{ id?: string; name: string; email: string; phone: string; destination: string; message: string; status: string; createdAt: any; read: boolean }> = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        messagesData.push({
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          destination: data.destination || data.subject || '',
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

      const leadsData: Lead[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const travelersCountValue =
          typeof data.travelersCount === 'number'
            ? data.travelersCount
            : parseInt(
              data.travelersCount ||
              data.members ||
              data.totalGuests ||
              data.peopleCount ||
              '',
              10
            )
        leadsData.push({
          id: doc.id,
          name: data.name || '',
          mobile: data.mobile || '',
          sourceUrl: data.sourceUrl || '',
          packageName: data.packageName || '',
          status: data.status || 'new',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          read: data.read || false,
          email: data.email || '',
          destination: data.destination || '',
          travelDate: data.travelDate || '',
          travelersCount: Number.isNaN(travelersCountValue) ? undefined : travelersCountValue,
          travelType: data.travelType || '',
          budget: data.budget || '',
          notes: data.notes || data.message || '',
        })
      })

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

  const formatDateForInput = (value?: string) => {
    if (!value) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toISOString().split('T')[0]
  }

  const startLeadDetailsEdit = (lead: Lead) => {
    setEditingLead(lead)
    setLeadDetailsError(null)
    setLeadDetailsForm({
      email: lead.email || '',
      destination: lead.destination || '',
      travelDate: formatDateForInput(lead.travelDate),
      travelersCount: lead.travelersCount ? String(lead.travelersCount) : '',
      travelType: lead.travelType || '',
      budget: lead.budget || '',
      notes: lead.notes || '',
    })
    setLeadDetailsModalOpen(true)
  }

  const handleLeadDetailsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setLeadDetailsForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const cancelLeadDetailsEdit = () => {
    setEditingLead(null)
    setLeadDetailsError(null)
    setLeadDetailsForm({
      email: '',
      destination: '',
      travelDate: '',
      travelersCount: '',
      travelType: '',
      budget: '',
      notes: '',
    })
    setLeadDetailsModalOpen(false)
  }

  const handleLeadDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLead?.id) return

    try {
      setIsLeadDetailsSaving(true)
      setLeadDetailsError(null)

      const dbInstance = getDbInstance()
      const updatePayload: Record<string, any> = {}

      const assignField = (key: string, value: string) => {
        const trimmed = value.trim()
        updatePayload[key] = trimmed ? trimmed : deleteField()
      }

      assignField('email', leadDetailsForm.email)
      assignField('destination', leadDetailsForm.destination)
      assignField('travelDate', leadDetailsForm.travelDate)
      assignField('travelType', leadDetailsForm.travelType)
      assignField('budget', leadDetailsForm.budget)
      assignField('notes', leadDetailsForm.notes)

      if (leadDetailsForm.travelersCount.trim()) {
        const count = parseInt(leadDetailsForm.travelersCount.trim(), 10)
        if (Number.isNaN(count) || count <= 0) {
          throw new Error('Travelers count must be a positive number')
        }
        updatePayload.travelersCount = count
      } else {
        updatePayload.travelersCount = deleteField()
      }

      await updateDoc(doc(dbInstance, 'leads', editingLead.id), updatePayload)
      await fetchLeads()
      cancelLeadDetailsEdit()
      alert('Lead details updated successfully!')
    } catch (error: any) {
      console.error('Error updating lead details:', error)
      setLeadDetailsError(error.message || 'Failed to update lead details. Please try again.')
    } finally {
      setIsLeadDetailsSaving(false)
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
        sectionHeader: blogFormData.sectionHeader || '',
        isFeatured: blogFormData.isFeatured || false,
        sectionOrder: blogFormData.sectionOrder !== undefined ? blogFormData.sectionOrder : 999,
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

      // Add slug if provided
      if (blogFormData.slug && blogFormData.slug.trim()) {
        blogData.slug = blogFormData.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
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
    setKeywordsInput(
      Array.isArray(blog.keywords)
        ? blog.keywords.join(', ')
        : typeof blog.keywords === 'string'
          ? blog.keywords
          : ''
    )
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
    setKeywordsInput('')
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
        // Auto-close on success after a short delay to show status
        setTimeout(() => {
          setShowBulkImport(false)
          setBulkImportStatus({ loading: false, success: 0, errors: [], processing: false })
        }, 1500)
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

  const handleBlogBulkImport = async () => {
    if (!blogBulkImportJson.trim()) {
      alert('Please paste JSON data before importing.')
      return
    }

    setBlogBulkImportStatus({
      loading: true,
      success: 0,
      errors: [],
      processing: true,
    })

    try {
      // Parse JSON
      let blogsData: BlogPost[]
      try {
        blogsData = JSON.parse(blogBulkImportJson)
      } catch (parseError) {
        setBlogBulkImportStatus({
          loading: false,
          success: 0,
          errors: [`Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`],
          processing: false,
        })
        return
      }

      // Validate it's an array
      if (!Array.isArray(blogsData)) {
        setBlogBulkImportStatus({
          loading: false,
          success: 0,
          errors: ['JSON must be an array of blog post objects'],
          processing: false,
        })
        return
      }

      if (blogsData.length === 0) {
        setBlogBulkImportStatus({
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
      const now = new Date().toISOString()

      // Process blogs one by one
      for (let i = 0; i < blogsData.length; i++) {
        const blog = blogsData[i]

        try {
          // Validate required fields
          const requiredFields: (keyof BlogPost)[] = ['title', 'description', 'content', 'image', 'author', 'category']
          const missingFields = requiredFields.filter(field => !blog[field])
          if (missingFields.length > 0) {
            errors.push(`Blog ${i + 1}: Missing required fields: ${missingFields.join(', ')}`)
            continue
          }

          // Validate field types
          if (typeof blog.title !== 'string') {
            errors.push(`Blog ${i + 1}: 'title' must be a string`)
            continue
          }
          if (typeof blog.description !== 'string') {
            errors.push(`Blog ${i + 1}: 'description' must be a string`)
            continue
          }
          if (typeof blog.content !== 'string') {
            errors.push(`Blog ${i + 1}: 'content' must be a string`)
            continue
          }
          if (typeof blog.image !== 'string') {
            errors.push(`Blog ${i + 1}: 'image' must be a string`)
            continue
          }

          // Validate blogStructure if present
          if (blog.blogStructure && !Array.isArray(blog.blogStructure)) {
            errors.push(`Blog ${i + 1}: 'blogStructure' must be an array`)
            continue
          }

          // Validate keywords if present
          if (blog.keywords && !Array.isArray(blog.keywords) && typeof blog.keywords !== 'string') {
            errors.push(`Blog ${i + 1}: 'keywords' must be an array of strings or a comma-separated string`)
            continue
          }

          // Prepare blog data
          const blogData: any = {
            title: blog.title,
            subtitle: blog.subtitle || '',
            description: blog.description,
            content: blog.content,
            image: blog.image,
            author: blog.author,
            authorImage: blog.authorImage || '',
            date: blog.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
            category: blog.category,
            sectionHeader: blog.sectionHeader || '',
            isFeatured: blog.isFeatured || false,
            sectionOrder: blog.sectionOrder !== undefined ? blog.sectionOrder : 999,
            readTime: blog.readTime || '5 min read',
            likes: blog.likes || 0,
            comments: blog.comments || 0,
            shares: blog.shares || 0,
            featured: blog.featured || false,
            published: blog.published !== undefined ? blog.published : true,
            createdAt: now,
            updatedAt: now,
            schemaType: blog.schemaType || 'BlogPosting',
          }

          // Include optional fields if they exist
          if (blog.blogStructure) {
            blogData.blogStructure = blog.blogStructure
          }
          if (blog.metaTitle) blogData.metaTitle = blog.metaTitle
          if (blog.metaDescription) blogData.metaDescription = blog.metaDescription
          if (blog.keywords) {
            if (Array.isArray(blog.keywords)) {
              blogData.keywords = blog.keywords
            } else if (typeof blog.keywords === 'string') {
              // Convert string "a, b, c" to array ["a", "b", "c"]
              blogData.keywords = (blog.keywords as string).split(',').map(k => k.trim()).filter(k => k)
            }
          }
          if (blog.canonicalUrl) blogData.canonicalUrl = blog.canonicalUrl
          if (blog.ogImage) blogData.ogImage = blog.ogImage

          // Add to Firestore
          await addDoc(collection(dbInstance, 'blogs'), blogData)
          successCount++
        } catch (error) {
          errors.push(`Blog ${i + 1} (${blog.title || 'Unknown'}): ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      setBlogBulkImportStatus({
        loading: false,
        success: successCount,
        errors,
        processing: false,
      })

      if (successCount > 0) {
        fetchBlogs()
        setBlogBulkImportJson('')
        // Auto-close on success after a short delay to show status
        setTimeout(() => {
          setShowBlogBulkImport(false)
          setBlogBulkImportStatus({ loading: false, success: 0, errors: [], processing: false })
        }, 1500)
      }
    } catch (error) {
      setBlogBulkImportStatus({
        loading: false,
        success: 0,
        errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        processing: false,
      })
    }
  }

  const handleBlogBulkImportCancel = () => {
    setShowBlogBulkImport(false)
    setBlogBulkImportJson('')
    setBlogBulkImportStatus({
      loading: false,
      success: 0,
      errors: [],
      processing: false,
    })
  }

  const loadBlogSampleTemplate = () => {
    const sample = [
      {
        "title": "10 Best Travel Destinations for 2025",
        "subtitle": "Discover the most amazing places to visit this year",
        "description": "From tropical paradises to cultural hubs, here are the top destinations you should add to your travel bucket list.",
        "content": "Travel is one of life's greatest pleasures. In this comprehensive guide, we explore the top destinations that should be on every traveler's radar for 2025.",
        "image": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
        "author": "Travel Expert",
        "date": "NOV 15",
        "category": "Travel Tips",
        "sectionHeader": "Travel Guides",
        "isFeatured": true,
        "sectionOrder": 1,
        "readTime": "5 min read",
        "published": true,
        "blogStructure": [
          {
            "type": "intro",
            "text": "As we step into 2025, the world of travel continues to evolve with new destinations emerging and classic favorites reinventing themselves. Whether you're seeking adventure, relaxation, or cultural immersion, this curated list has something for every type of traveler."
          },
          {
            "type": "heading",
            "text": "Top Destinations for 2025"
          },
          {
            "type": "paragraph",
            "text": "The travel landscape is constantly changing, and 2025 brings exciting new opportunities for exploration. From hidden gems to popular destinations with fresh perspectives, these locations offer unforgettable experiences."
          },
          {
            "type": "image",
            "imageUrl": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
            "imageAlt": "Beautiful travel destination"
          },
          {
            "type": "subheading",
            "text": "1. Bali, Indonesia"
          },
          {
            "type": "paragraph",
            "text": "Bali continues to be a top destination for travelers seeking a perfect blend of culture, nature, and relaxation. With its stunning beaches, ancient temples, and vibrant arts scene, Bali offers something for everyone."
          },
          {
            "type": "subheading",
            "text": "2. Santorini, Greece"
          },
          {
            "type": "paragraph",
            "text": "The iconic white-washed buildings and breathtaking sunsets make Santorini a dream destination. Perfect for romantic getaways and photography enthusiasts."
          },
          {
            "type": "list",
            "items": [
              "Book accommodations in advance during peak season",
              "Explore beyond the main tourist areas",
              "Try local cuisine at family-run restaurants",
              "Respect local customs and traditions",
              "Pack appropriate clothing for cultural sites"
            ]
          },
          {
            "type": "quote",
            "text": "Travel is the only thing you buy that makes you richer.",
            "author": "Anonymous"
          },
          {
            "type": "heading",
            "text": "Planning Your 2025 Adventure"
          },
          {
            "type": "paragraph",
            "text": "When planning your travels for 2025, consider factors like weather, local events, and travel restrictions. Early planning can help you secure better deals and ensure availability at popular destinations."
          },
          {
            "type": "divider"
          },
          {
            "type": "faq",
            "faqs": [
              {
                "question": "What is the best time to visit these destinations?",
                "answer": "The best time varies by destination. Generally, shoulder seasons (spring and fall) offer good weather with fewer crowds and better prices."
              },
              {
                "question": "Do I need travel insurance?",
                "answer": "Yes, travel insurance is highly recommended, especially for international trips. It provides coverage for medical emergencies, trip cancellations, and lost luggage."
              }
            ]
          },
          {
            "type": "cta",
            "text": "Ready to explore these amazing destinations? Browse our curated travel packages and start planning your 2025 adventure today.",
            "link": "/destinations",
            "linkText": "Explore Packages"
          }
        ]
      },
      {
        "title": "How to Plan the Perfect Honeymoon",
        "subtitle": "A complete guide to planning your dream romantic getaway",
        "description": "Everything you need to know about planning a memorable honeymoon that you and your partner will cherish forever.",
        "content": "Planning a honeymoon can be overwhelming, but with the right guidance, you can create the perfect romantic escape.",
        "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        "author": "Romance Travel",
        "date": "NOV 12",
        "category": "Honeymoon",
        "sectionHeader": "Travel Guides",
        "isFeatured": false,
        "sectionOrder": 2,
        "readTime": "7 min read",
        "published": true,
        "blogStructure": [
          {
            "type": "intro",
            "text": "Your honeymoon is one of the most special trips you'll ever take. It's a time to celebrate your new life together and create memories that will last a lifetime. With careful planning, you can ensure it's everything you've dreamed of."
          },
          {
            "type": "heading",
            "text": "Setting Your Honeymoon Budget"
          },
          {
            "type": "paragraph",
            "text": "Before diving into destination research, establish a realistic budget. Consider all expenses including flights, accommodations, meals, activities, and a buffer for unexpected costs."
          },
          {
            "type": "image",
            "imageUrl": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
            "imageAlt": "Romantic honeymoon destination"
          },
          {
            "type": "subheading",
            "text": "Choosing the Perfect Destination"
          },
          {
            "type": "paragraph",
            "text": "Select a destination that matches both your interests and travel style. Whether you prefer beach relaxation, mountain adventures, or cultural exploration, there's a perfect honeymoon spot for every couple."
          },
          {
            "type": "list",
            "items": [
              "Discuss your dream destinations together",
              "Consider the time of year and weather",
              "Think about your travel style (relaxation vs. adventure)",
              "Research visa requirements",
              "Check travel advisories"
            ]
          },
          {
            "type": "quote",
            "text": "A successful marriage requires falling in love many times, always with the same person.",
            "author": "Mignon McLaughlin"
          },
          {
            "type": "heading",
            "text": "Honeymoon Planning Timeline"
          },
          {
            "type": "paragraph",
            "text": "Start planning your honeymoon 6-12 months in advance, especially if you're traveling during peak season or to popular destinations. This gives you time to research, compare prices, and make reservations."
          },
          {
            "type": "cta",
            "text": "Let us help you plan the perfect honeymoon. Explore our romantic travel packages designed specifically for couples.",
            "link": "/destinations",
            "linkText": "View Honeymoon Packages"
          }
        ]
      },
      {
        "title": "Budget Travel Tips for Backpackers",
        "subtitle": "Travel the world without breaking the bank",
        "description": "Learn how to explore amazing destinations on a budget with these proven money-saving strategies.",
        "content": "Traveling on a budget doesn't mean sacrificing experiences. Here are practical tips to help you see the world affordably.",
        "image": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
        "author": "Budget Traveler",
        "date": "NOV 10",
        "category": "Budget Travel",
        "sectionHeader": "Travel Tips",
        "isFeatured": true,
        "sectionOrder": 1,
        "readTime": "6 min read",
        "published": true,
        "blogStructure": [
          {
            "type": "intro",
            "text": "Traveling on a budget doesn't mean you have to compromise on experiences. With smart planning and a few insider tips, you can explore the world without emptying your wallet."
          },
          {
            "type": "heading",
            "text": "Money-Saving Travel Strategies"
          },
          {
            "type": "paragraph",
            "text": "The key to budget travel is being flexible and resourceful. From finding affordable accommodations to eating like a local, there are countless ways to stretch your travel budget."
          },
          {
            "type": "image",
            "imageUrl": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
            "imageAlt": "Budget backpacker traveling"
          },
          {
            "type": "subheading",
            "text": "Accommodation Hacks"
          },
          {
            "type": "paragraph",
            "text": "Skip expensive hotels and opt for hostels, guesthouses, or homestays. Many offer private rooms at a fraction of hotel prices while providing authentic local experiences."
          },
          {
            "type": "subheading",
            "text": "Eating on a Budget"
          },
          {
            "type": "paragraph",
            "text": "Avoid tourist restaurants and eat where locals eat. Street food, local markets, and family-run establishments offer delicious meals at much lower prices."
          },
          {
            "type": "list",
            "items": [
              "Travel during off-peak seasons",
              "Book flights in advance or use last-minute deals",
              "Use public transportation",
              "Cook your own meals when possible",
              "Look for free walking tours and activities",
              "Travel with a group to split costs",
              "Use travel reward credit cards"
            ]
          },
          {
            "type": "divider"
          },
          {
            "type": "faq",
            "faqs": [
              {
                "question": "How can I find cheap flights?",
                "answer": "Use flight comparison websites, be flexible with dates, consider nearby airports, and sign up for airline newsletters for special deals."
              },
              {
                "question": "Is it safe to stay in hostels?",
                "answer": "Yes, most hostels are safe and well-maintained. Read reviews, choose hostels with lockers, and trust your instincts when selecting accommodations."
              }
            ]
          },
          {
            "type": "cta",
            "text": "Ready to start your budget adventure? Check out our affordable travel packages designed for budget-conscious travelers.",
            "link": "/destinations",
            "linkText": "Browse Budget Packages"
          }
        ]
      }
    ]
    setBlogBulkImportJson(JSON.stringify(sample, null, 2))
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
        "Highlights": [
          "Romantic sunset dinner",
          "Private pool villa experience",
          "Full day island tour",
          "Spa therapy",
          "Sunset view"
        ],
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
        "Meta_Image_URL": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1600&q=80",
        "Guest_Reviews": [
          {
            "name": "John Doe",
            "content": "Amazing experience! The itinerary was perfect.",
            "date": "2024-12-01",
            "rating": "5"
          }
        ],
        "Booking_Policies": {
          "booking": ["20% Advance to confirm", "50% 30 Days before travel", "100% 15 Days before travel"],
          "payment": ["Bank Transfer", "Credit Card", "UPI"],
          "cancellation": ["Free cancellation up to 30 days before travel", "50% refund up to 15 days", "No refund within 15 days"]
        },
        "FAQ_Items": [
          {
            "question": "Is breakfast included?",
            "answer": "Yes, daily breakfast is included at all hotels."
          }
        ],
        "Why_Book_With_Us": [
          {
            "label": "24/7 Support",
            "description": "We are available round the clock for any assistance."
          },
          {
            "label": "Best Price Guarantee",
            "description": "We match any comparable price you find elsewhere."
          }
        ]
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
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4 mt-12">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-primary bg-white border border-gray-200 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-semibold">Back to Home</span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage packages, blogs, users, and leads</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{currentUser?.email}</span>
            </div>
          </div>
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
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'dashboard'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
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
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'packages'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'packages' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
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
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'blogs'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'blogs' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
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
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'destinations'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'destinations' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
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
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'users'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'users' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
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
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'leads'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'leads' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
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
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'contacts'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'contacts' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
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
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'subscribers'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'subscribers' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
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
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'careers'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'careers' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
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
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'testimonials'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'testimonials' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
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

            <button
              onClick={() => setActiveTab('ai-generator')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'ai-generator'
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-purple-400 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'ai-generator' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-purple-100 group-hover:text-purple-600'
                }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'ai-generator' ? 'text-purple-600' : 'text-gray-700'}`}>
                  AI Generator
                </div>
                <div className="text-xs text-gray-500 mt-0.5">New</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('create-itinerary')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'create-itinerary'
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-indigo-400 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'create-itinerary' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'create-itinerary' ? 'text-indigo-600' : 'text-gray-700'}`}>
                  Itinerary
                </div>
                <div className="text-xs text-gray-500 mt-0.5">New</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('customer-records')}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${activeTab === 'customer-records'
                ? 'border-emerald-500 bg-emerald-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-emerald-400 hover:shadow-sm'
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'customer-records' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${activeTab === 'customer-records' ? 'text-emerald-600' : 'text-gray-700'}`}>
                  CRM
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Records</div>
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
                {/* Title removed as it is now in the sticky header */}
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
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900">All Packages</h2>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search packages..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                      />
                      <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
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
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('Destination_Name')}
                        >
                          Destination <SortIcon column="Destination_Name" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('Duration')}
                        >
                          Duration <SortIcon column="Duration" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('Price_Min_INR')}
                        >
                          Price <SortIcon column="Price_Min_INR" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('Travel_Type')}
                        >
                          Type <SortIcon column="Travel_Type" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getSortedAndFilteredData(packages, ['Destination_Name', 'Destination_ID']).map((pkg) => (
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
                {/* Title removed as it is now in the sticky header */}
                <form onSubmit={handleBlogSubmit} className="space-y-6 relative">
                  {/* Sticky Action Bar */}
                  <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 py-4 mb-6 flex justify-between items-center shadow-sm -mx-6 px-6 rounded-t-xl">
                    <h3 className="text-lg font-bold text-gray-900">
                      {editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
                    </h3>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBlogForm(false)
                          setEditingBlog(null)
                          setBlogFormData({})
                        }}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors text-sm shadow-sm"
                      >
                        {editingBlog ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">URL Slug</label>
                      <input
                        type="text"
                        name="slug"
                        value={blogFormData.slug || ''}
                        onChange={handleBlogInputChange}
                        placeholder="my-custom-blog-url"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-gray-500 mt-1">Custom URL slug (e.g., why-visit-bali-2025). Leave empty to auto-generate from title.</p>
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Section Header</label>
                      <input
                        type="text"
                        name="sectionHeader"
                        value={blogFormData.sectionHeader || ''}
                        onChange={handleBlogInputChange}
                        placeholder="Politics, Sports, SBSQ, etc."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-gray-500 mt-1">Group posts by section (e.g., "Politics", "Sports")</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Section Order</label>
                      <input
                        type="number"
                        name="sectionOrder"
                        value={blogFormData.sectionOrder || ''}
                        onChange={(e) => {
                          setBlogFormData((prev) => ({
                            ...prev,
                            sectionOrder: e.target.value ? parseInt(e.target.value) : undefined,
                          }))
                        }}
                        placeholder="1, 2, 3..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-gray-500 mt-1">Order within the section (lower numbers appear first)</p>
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
                            URL Slug (e.g., bali-5-day-itinerary)
                          </label>
                          <input
                            type="text"
                            name="slug"
                            value={blogFormData.slug || ''}
                            onChange={(e) => {
                              // Auto-format slug: lowercase, replace spaces with hyphens, remove special chars
                              const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                              setBlogFormData(prev => ({ ...prev, slug: val }))
                            }}
                            placeholder="leave-empty-to-auto-generate-from-title"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            This will be part of the URL: /blog/category/<b>slug</b>
                          </p>
                        </div>
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
                            value={keywordsInput}
                            onChange={(e) => {
                              setKeywordsInput(e.target.value)
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

                    <div className="flex items-center gap-6 flex-wrap">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="featured"
                          checked={blogFormData.featured || false}
                          onChange={handleBlogInputChange}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm font-semibold text-gray-700">Featured (Legacy)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="isFeatured"
                          checked={blogFormData.isFeatured || false}
                          onChange={(e) => {
                            setBlogFormData((prev) => ({
                              ...prev,
                              isFeatured: e.target.checked,
                            }))
                          }}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm font-semibold text-gray-700">Featured in Section (Large Image on Left)</span>
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
                  {/* Bottom buttons removed as they are now in the sticky header */}
                </form >
              </div >
            )
            }

            {
              !showBlogForm && !showBlogBulkImport && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold text-gray-900">All Blog Posts</h2>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search blogs..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      >
                        <option value="all">All Status</option>
                        <option value="true">Published</option>
                        <option value="false">Draft</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowBlogBulkImport(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Bulk Import JSON
                      </button>
                      <button
                        onClick={handleNewBlog}
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
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('title')}
                          >
                            Title <SortIcon column="title" />
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('category')}
                          >
                            Category <SortIcon column="category" />
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('author')}
                          >
                            Author <SortIcon column="author" />
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('date')}
                          >
                            Date <SortIcon column="date" />
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('views')}
                          >
                            Views <SortIcon column="views" />
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('published')}
                          >
                            Status <SortIcon column="published" />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getSortedAndFilteredData(blogs, ['title', 'category', 'author'], statusFilter === 'all' ? undefined : 'published').map((blog) => (
                          <tr key={blog.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{blog.title}</div>
                              {blog.subtitle && <div className="text-sm text-gray-500">{blog.subtitle}</div>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{blog.category}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{blog.author}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{blog.date}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className="font-semibold">{blog.views || 0}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${blog.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
              )
            }

            {/* Blog Bulk Import Section */}
            {
              showBlogBulkImport && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Bulk Import Blog Posts (JSON)</h2>
                    <button
                      onClick={handleBlogBulkImportCancel}
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
                          Paste JSON Array of Blog Posts
                        </label>
                        <button
                          type="button"
                          onClick={loadBlogSampleTemplate}
                          className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Load Sample Template
                        </button>
                      </div>
                      <textarea
                        value={blogBulkImportJson}
                        onChange={(e) => setBlogBulkImportJson(e.target.value)}
                        placeholder={`[\n  {\n    "title": "Blog Post Title",\n    "subtitle": "Optional subtitle",\n    "description": "Brief description",\n    "content": "Full blog content...",\n    "image": "https://example.com/image.jpg",\n    "author": "Author Name",\n    "date": "NOV 15",\n    "category": "Travel Tips",\n    "sectionHeader": "Travel Guides",\n    "isFeatured": true,\n    "sectionOrder": 1,\n    "readTime": "5 min read",\n    "published": true\n  },\n  ...\n]`}
                        rows={15}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-blue-900 mb-2">Required Fields:</h3>
                      <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li><strong>title</strong> - Blog post title</li>
                        <li><strong>description</strong> - Brief description/summary</li>
                        <li><strong>content</strong> - Full blog content</li>
                        <li><strong>image</strong> - Main image URL</li>
                        <li><strong>author</strong> - Author name</li>
                        <li><strong>category</strong> - Blog category</li>
                      </ul>
                      <h3 className="text-sm font-semibold text-blue-900 mt-3 mb-2">Optional Fields:</h3>
                      <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li><strong>subtitle</strong> - Optional subtitle</li>
                        <li><strong>date</strong> - Publication date (defaults to current date)</li>
                        <li><strong>sectionHeader</strong> - Section header</li>
                        <li><strong>isFeatured</strong> - Boolean (default: false)</li>
                        <li><strong>sectionOrder</strong> - Number for ordering (default: 999)</li>
                        <li><strong>readTime</strong> - Reading time estimate (default: "5 min read")</li>
                        <li><strong>published</strong> - Boolean (default: true)</li>
                        <li><strong>authorImage</strong> - Author profile image URL</li>
                        <li><strong>blogStructure</strong> - Array of blog sections</li>
                        <li><strong>metaTitle</strong> - SEO meta title</li>
                        <li><strong>metaDescription</strong> - SEO meta description</li>
                        <li><strong>keywords</strong> - SEO keywords</li>
                      </ul>
                    </div>

                    {blogBulkImportStatus.processing && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-sm font-semibold text-yellow-800">Processing import...</span>
                        </div>
                      </div>
                    )}

                    {blogBulkImportStatus.success > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-green-800">
                          ✓ Successfully imported {blogBulkImportStatus.success} blog post{blogBulkImportStatus.success !== 1 ? 's' : ''}!
                        </p>
                      </div>
                    )}

                    {blogBulkImportStatus.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-red-800 mb-2">Errors ({blogBulkImportStatus.errors.length}):</h3>
                        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside max-h-40 overflow-y-auto">
                          {blogBulkImportStatus.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleBlogBulkImport}
                        disabled={blogBulkImportStatus.processing || !blogBulkImportJson.trim()}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {blogBulkImportStatus.processing ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Importing...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Import Blogs
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleBlogBulkImportCancel}
                        disabled={blogBulkImportStatus.processing}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )
            }
          </div >
        )}

        {/* Destinations Tab */}
        {
          activeTab === 'destinations' && (
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
                        rating: destinationFormData.rating || null,
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
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Rating (4.0 - 5.0)</label>
                          <input
                            type="number"
                            min="4.0"
                            max="5.0"
                            step="0.1"
                            value={destinationFormData.rating || ''}
                            onChange={(e) => setDestinationFormData({ ...destinationFormData, rating: parseFloat(e.target.value) || undefined })}
                            placeholder="e.g., 4.8"
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
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold text-gray-900">All Destinations</h2>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search destinations..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
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
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('name')}
                          >
                            Name <SortIcon column="name" />
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('country')}
                          >
                            Country <SortIcon column="country" />
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('slug')}
                          >
                            Slug <SortIcon column="slug" />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Packages</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getSortedAndFilteredData(destinations, ['name', 'country', 'slug']).map((dest) => (
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
          )
        }

        {/* Users Tab */}
        {
          activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900">All Users ({users.length})</h2>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                      />
                      <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      <option value="all">All Roles</option>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
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
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('displayName')}
                        >
                          User <SortIcon column="displayName" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('email')}
                        >
                          Email <SortIcon column="email" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('role')}
                        >
                          Role <SortIcon column="role" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('isActive')}
                        >
                          Status <SortIcon column="isActive" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('createdAt')}
                        >
                          Joined <SortIcon column="createdAt" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('lastLogin')}
                        >
                          Last Login <SortIcon column="lastLogin" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getSortedAndFilteredData(users, ['displayName', 'email'], statusFilter === 'all' ? undefined : 'role').map((user) => (
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
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                                className={`text-xs px-3 py-1.5 border rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${user.role === 'admin'
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
          )
        }

        {/* Newsletter Subscribers Tab */}
        {
          activeTab === 'subscribers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900">Newsletter Subscribers ({subscribers.length})</h2>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search subscribers..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                      />
                      <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="unsubscribed">Unsubscribed</option>
                    </select>
                  </div>
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
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('email')}
                        >
                          Email <SortIcon column="email" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          Status <SortIcon column="status" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('source')}
                        >
                          Source <SortIcon column="source" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('subscribedAt')}
                        >
                          Subscribed Date <SortIcon column="subscribedAt" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getSortedAndFilteredData(subscribers, ['email', 'source'], statusFilter === 'all' ? undefined : 'status').map((subscriber) => (
                        <tr key={subscriber.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{subscriber.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${subscriber.status === 'active'
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
          )
        }

        {/* Contact Messages Tab */}
        {
          activeTab === 'contacts' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900">Contact Messages ({contactMessages.length})</h2>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search messages..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                      />
                      <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="replied">Replied</option>
                    </select>
                  </div>
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
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          Name <SortIcon column="name" />
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={() => handleSort('email')}
                        >
                          Email <SortIcon column="email" />
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={() => handleSort('phone')}
                        >
                          Phone <SortIcon column="phone" />
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={() => handleSort('destination')}
                        >
                          Destination <SortIcon column="destination" />
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          Status <SortIcon column="status" />
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={() => handleSort('createdAt')}
                        >
                          Date <SortIcon column="createdAt" />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {getSortedAndFilteredData(contactMessages, ['name', 'email', 'phone', 'destination', 'message'], statusFilter === 'all' ? undefined : 'status').map((message) => (
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
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={message.destination}>
                              {message.destination}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${message.status === 'new'
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
                                          <p className="text-sm font-semibold text-gray-500 mb-1">Destination</p>
                                          <p className="text-gray-900 font-medium">{message.destination}</p>
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
          )
        }

        {/* Leads Tab */}
        {
          activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900">Leads ({leads.length})</h2>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search leads..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                      />
                      <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
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
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          Name <SortIcon column="name" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('mobile')}
                        >
                          Mobile <SortIcon column="mobile" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('packageName')}
                        >
                          Package <SortIcon column="packageName" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source URL</th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          Status <SortIcon column="status" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('createdAt')}
                        >
                          Date <SortIcon column="createdAt" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getSortedAndFilteredData(leads, ['name', 'mobile', 'packageName', 'status'], statusFilter === 'all' ? undefined : 'status').map((lead) => (
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
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${lead.status === 'new' ? 'bg-green-100 text-green-800' :
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
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => startLeadDetailsEdit(lead)}
                                className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-semibold transition-colors"
                              >
                                {lead.destination || lead.travelDate || lead.travelersCount ? 'Edit Details' : 'Add Details'}
                              </button>
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
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${lead.status === 'new' ? 'bg-green-100 text-green-800' :
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
          )
        }

        {/* Job Applications Tab */}
        {
          activeTab === 'careers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900">Job Applications ({jobApplications.length})</h2>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search applications..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                      />
                      <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="contacted">Contacted</option>
                    </select>
                  </div>
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
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          Name <SortIcon column="name" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('email')}
                        >
                          Email <SortIcon column="email" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('position')}
                        >
                          Position <SortIcon column="position" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('phone')}
                        >
                          Phone <SortIcon column="phone" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LinkedIn</th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          Status <SortIcon column="status" />
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('createdAt')}
                        >
                          Date <SortIcon column="createdAt" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getSortedAndFilteredData(jobApplications, ['name', 'email', 'position', 'phone', 'status'], statusFilter === 'all' ? undefined : 'status').map((application) => (
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
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${application.status === 'new'
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
          )
        }

        {/* Testimonials Tab */}
        {
          activeTab === 'testimonials' && (
            <div className="space-y-6">
              {showTestimonialForm && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  {/* Title removed as it is now in the sticky header */}
                  <form onSubmit={handleTestimonialSubmit} className="space-y-6 relative">
                    {/* Sticky Action Bar */}
                    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 py-4 mb-6 flex justify-between items-center shadow-sm -mx-6 px-6 rounded-t-xl">
                      <h3 className="text-lg font-bold text-gray-900">
                        {editingTestimonial ? 'Edit Testimonial' : 'Create New Testimonial'}
                      </h3>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowTestimonialForm(false)
                            setEditingTestimonial(null)
                            setTestimonialFormData({})
                          }}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors text-sm shadow-sm"
                        >
                          {editingTestimonial ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </div>
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
                    {/* Bottom Action Bar */}
                    <div className="flex gap-4 pt-4 border-t border-gray-200 mt-8">
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
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold text-gray-900">All Testimonials</h2>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search testimonials..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      >
                        <option value="all">All Status</option>
                        <option value="true">Featured</option>
                        <option value="false">Regular</option>
                      </select>
                    </div>
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
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('name')}
                          >
                            Name <SortIcon column="name" />
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('rating')}
                          >
                            Rating <SortIcon column="rating" />
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('quote')}
                          >
                            Quote <SortIcon column="quote" />
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('featured')}
                          >
                            Featured <SortIcon column="featured" />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getSortedAndFilteredData(testimonials, ['name', 'quote'], statusFilter === 'all' ? undefined : 'featured').map((testimonial) => (
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
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${testimonial.featured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
          )
        }

        {/* AI Package Generator Tab */}
        {activeTab === 'ai-generator' && (
          <AIPackageGenerator
            onImportPackages={async (generatedPackages) => {
              const dbInstance = getDbInstance();
              let successCount = 0;
              let skippedCount = 0;
              const errors: string[] = [];
              const skipped: string[] = [];

              // First, fetch all existing package Destination_IDs from database
              const packagesRef = collection(dbInstance, 'packages');
              const existingSnapshot = await getDocs(packagesRef);
              const existingIds = new Set<string>();
              existingSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.Destination_ID) {
                  // Normalize: trim whitespace and convert to uppercase for comparison
                  existingIds.add(String(data.Destination_ID).trim().toUpperCase());
                }
              });

              console.log(`Found ${existingIds.size} existing packages in database`);
              console.log('Existing IDs (normalized):', Array.from(existingIds));

              for (const pkg of generatedPackages) {
                // Normalize the incoming ID for comparison
                const normalizedId = String(pkg.Destination_ID || '').trim().toUpperCase();

                console.log(`Checking package: "${pkg.Destination_ID}" -> normalized: "${normalizedId}"`);
                console.log(`Exists in database: ${existingIds.has(normalizedId)}`);

                // Check if package already exists
                if (normalizedId && existingIds.has(normalizedId)) {
                  console.log(`>>> Skipping duplicate: ${pkg.Destination_ID}`);
                  skipped.push(pkg.Destination_ID);
                  skippedCount++;
                  continue;
                }

                try {
                  // Prepare package data for Firestore
                  const packageData: any = {
                    Destination_ID: pkg.Destination_ID,
                    Destination_Name: pkg.Destination_Name,
                    Overview: pkg.Overview || '',
                    Duration: pkg.Duration || '',
                    Duration_Nights: pkg.Duration_Nights || 0,
                    Duration_Days: pkg.Duration_Days || 0,
                    Price_Range_INR: pkg.Price_Range_INR || '',
                    Price_Min_INR: pkg.Price_Min_INR || 0,
                    Price_Max_INR: pkg.Price_Max_INR || 0,
                    Travel_Type: pkg.Travel_Type || '',
                    Mood: pkg.Mood || '',
                    Occasion: pkg.Occasion || '',
                    Budget_Category: pkg.Budget_Category || '',
                    Theme: pkg.Theme || '',
                    Adventure_Level: pkg.Adventure_Level || '',
                    Stay_Type: pkg.Stay_Type || '',
                    Star_Category: pkg.Star_Category || '',
                    Meal_Plan: pkg.Meal_Plan || '',
                    Group_Size: pkg.Group_Size || '',
                    Child_Friendly: pkg.Child_Friendly || '',
                    Elderly_Friendly: pkg.Elderly_Friendly || '',
                    Language_Preference: pkg.Language_Preference || '',
                    Seasonality: pkg.Seasonality || '',
                    Hotel_Examples: pkg.Hotel_Examples || '',
                    Inclusions: pkg.Inclusions || '',
                    Exclusions: pkg.Exclusions || '',
                    Day_Wise_Itinerary: pkg.Day_Wise_Itinerary || '',
                    Rating: pkg.Rating || '',
                    Location_Breakup: pkg.Location_Breakup || '',
                    Airport_Code: pkg.Airport_Code || '',
                    Transfer_Type: pkg.Transfer_Type || '',
                    Currency: pkg.Currency || 'INR',
                    Climate_Type: pkg.Climate_Type || '',
                    Safety_Score: pkg.Safety_Score || '',
                    Sustainability_Score: pkg.Sustainability_Score || '',
                    Ideal_Traveler_Persona: pkg.Ideal_Traveler_Persona || '',
                    Slug: pkg.Slug || '',
                    Primary_Image_URL: pkg.Primary_Image_URL || '',
                    Booking_URL: pkg.Booking_URL || '',
                    SEO_Title: pkg.SEO_Title || '',
                    SEO_Description: pkg.SEO_Description || '',
                    SEO_Keywords: pkg.SEO_Keywords || '',
                    Meta_Image_URL: pkg.Meta_Image_URL || pkg.Primary_Image_URL || '',
                    Guest_Reviews: pkg.Guest_Reviews || [],
                    Booking_Policies: pkg.Booking_Policies || {},
                    FAQ_Items: pkg.FAQ_Items || [],
                    Why_Book_With_Us: pkg.Why_Book_With_Us || [],
                    Highlights: pkg.Highlights || [],
                    Day_Wise_Itinerary_Details: pkg.Day_Wise_Itinerary_Details || [],
                    Created_By: currentUser?.email || 'AI Generator',
                    Last_Updated: new Date().toISOString().split('T')[0],
                  };

                  await addDoc(collection(dbInstance, 'packages'), packageData);
                  successCount++;
                } catch (error) {
                  errors.push(`${pkg.Destination_ID}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }

              // Build result message
              let message = '';
              if (successCount > 0) {
                message += `✅ Successfully imported ${successCount} new packages!\n`;
              }
              if (skippedCount > 0) {
                message += `⏭️ Skipped ${skippedCount} packages (already exist): ${skipped.join(', ')}\n`;
              }
              if (errors.length > 0) {
                message += `❌ Errors:\n${errors.join('\n')}`;
              }
              if (successCount === 0 && skippedCount === 0 && errors.length === 0) {
                message = 'No packages to import.';
              }

              if (successCount > 0) {
                fetchPackages();
              }
              alert(message);
            }}
          />
        )}

        {/* Create Itinerary Tab */}
        {activeTab === 'create-itinerary' && (
          <ItineraryGenerator />
        )}

        {/* Customer Records CRM Tab */}
        {activeTab === 'customer-records' && (
          <CustomerRecordsManager />
        )}
      </div >

      <Footer />

      {/* View Modal */}
      <ViewModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, title: '', content: null })}
        title={viewModal.title}
      >
        {viewModal.content}
      </ViewModal>

      <ViewModal
        isOpen={isLeadDetailsModalOpen && Boolean(editingLead)}
        onClose={cancelLeadDetailsEdit}
        title={editingLead ? `Update Lead Details` : 'Update Lead Details'}
      >
        <form onSubmit={handleLeadDetailsSubmit} className="space-y-4">
          {leadDetailsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {leadDetailsError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={leadDetailsForm.email}
                onChange={handleLeadDetailsChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="guest@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Destination</label>
              <input
                type="text"
                name="destination"
                value={leadDetailsForm.destination}
                onChange={handleLeadDetailsChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Bali, Kerala, Maldives..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Travel Date</label>
              <input
                type="date"
                name="travelDate"
                value={leadDetailsForm.travelDate}
                onChange={handleLeadDetailsChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Travelers Count</label>
              <input
                type="number"
                name="travelersCount"
                min={1}
                value={leadDetailsForm.travelersCount}
                onChange={handleLeadDetailsChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Travel Style</label>
              <input
                type="text"
                name="travelType"
                value={leadDetailsForm.travelType}
                onChange={handleLeadDetailsChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Couple, Family, Friends..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Budget Preference</label>
              <input
                type="text"
                name="budget"
                value={leadDetailsForm.budget}
                onChange={handleLeadDetailsChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Budget / Mid-range / Luxury"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Internal Notes</label>
            <textarea
              name="notes"
              rows={4}
              value={leadDetailsForm.notes}
              onChange={handleLeadDetailsChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Add requirements shared during call, hotel category, preferred airline..."
            />
          </div>
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 -mb-6 flex flex-col-reverse md:flex-row md:justify-end gap-3 mt-4 z-10">
            <button
              type="button"
              onClick={cancelLeadDetailsEdit}
              className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLeadDetailsSaving}
              className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLeadDetailsSaving ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        </form>
      </ViewModal>
    </main >
  )
}
