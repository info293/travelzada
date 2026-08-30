'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import VendorsSection from '@/components/admin/VendorsSection'
import { Vendor, VendorLead } from '@/components/admin/types'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function AdminVendorPage() {
  const { currentUser, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorLeads, setVendorLeads] = useState<VendorLead[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || !isAdmin) {
        router.push('/')
        return
      }
      fetchAllData()
    }
  }, [currentUser, isAdmin, authLoading, router])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchVendors(), fetchVendorLeads()])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      let querySnapshot
      try {
        const q = query(collection(db, 'vendors'), orderBy('createdAt', 'desc'))
        querySnapshot = await getDocs(q)
      } catch {
        querySnapshot = await getDocs(collection(db, 'vendors'))
      }
      const vendorsData: Vendor[] = []
      querySnapshot.forEach((doc) => {
        vendorsData.push({ id: doc.id, ...doc.data() } as Vendor)
      })
      setVendors(vendorsData)
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const fetchVendorLeads = async () => {
    try {
      let querySnapshot
      try {
        const q = query(collection(db, 'vendor_leads'), orderBy('createdAt', 'desc'))
        querySnapshot = await getDocs(q)
      } catch {
        querySnapshot = await getDocs(collection(db, 'vendor_leads'))
      }
      const leadsData: VendorLead[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        leadsData.push({
          id: doc.id,
          vendorId: data.vendorId || '',
          vendorKey: data.vendorKey || '',
          vendorName: data.vendorName || '',
          userName: data.userName || '',
          userPhone: data.userPhone || '',
          userEmail: data.userEmail || '',
          rewardTitle: data.rewardTitle || '',
          rewardCode: data.rewardCode || '',
          claimCode: data.claimCode || '',
          status: data.status || 'new',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          notes: data.notes || '',
        })
      })
      setVendorLeads(leadsData)
    } catch (error) {
      console.error('Error fetching vendor leads:', error)
    }
  }

  const handleAddVendor = async (vendorData: Partial<Vendor>) => {
    const now = new Date().toISOString()
    const newVendor = {
      ...vendorData,
      totalScans: vendorData.totalScans || 0,
      totalClaims: vendorData.totalClaims || 0,
      createdAt: now,
      updatedAt: now,
    }
    await addDoc(collection(db, 'vendors'), newVendor)
    await fetchVendors()
  }

  const handleUpdateVendor = async (id: string, vendorData: Partial<Vendor>) => {
    const now = new Date().toISOString()
    await updateDoc(doc(db, 'vendors', id), {
      ...vendorData,
      updatedAt: now,
    })
    await fetchVendors()
  }

  const handleDeleteVendor = async (id: string) => {
    await deleteDoc(doc(db, 'vendors', id))
    await fetchVendors()
  }

  const handleUpdateVendorLeadStatus = async (leadId: string, status: 'new' | 'contacted' | 'redeemed' | 'expired') => {
    await updateDoc(doc(db, 'vendor_leads', leadId), { status })
    await fetchVendorLeads()
  }

  const handleDeleteVendorLead = async (leadId: string) => {
    await deleteDoc(doc(db, 'vendor_leads', leadId))
    await fetchVendorLeads()
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Vendor Marketing System...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-amber-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
          </Link>
          <span className="text-xs text-gray-400 font-mono">http://localhost:3000/admin/vendor</span>
        </div>

        {/* Vendors Section Component */}
        <VendorsSection
          vendors={vendors}
          vendorLeads={vendorLeads}
          onAddVendor={handleAddVendor}
          onUpdateVendor={handleUpdateVendor}
          onDeleteVendor={handleDeleteVendor}
          onUpdateLeadStatus={handleUpdateVendorLeadStatus}
          onDeleteLead={handleDeleteVendorLead}
          refreshData={() => {
            fetchVendors()
            fetchVendorLeads()
          }}
        />
      </main>

      <Footer />
    </div>
  )
}
