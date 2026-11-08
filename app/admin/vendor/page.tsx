'use client'

import React, { useEffect, useState } from 'react'
import VendorsSection from '@/components/admin/VendorsSection'
import { Vendor, VendorLead } from '@/components/admin/types'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PageHeader, Spinner } from '@/components/admin/ui'

export default function AdminVendorPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorLeads, setVendorLeads] = useState<VendorLead[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  if (isLoading) return <Spinner label="Loading vendors…" />

  return (
    <div>
      <PageHeader title="Vendors" description="Vendor QR campaigns, quiz questions, spin-wheel rewards and the leads they bring in" />
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
    </div>
  )
}
