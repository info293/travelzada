'use client'

import React, { useState, useEffect } from 'react'
import { Vendor, VendorLead, VendorReward, VendorQuestion } from './types'
import {
  Plus, Search, QrCode, Edit, Trash2, CheckCircle2, XCircle, Download, ExternalLink,
  Users, Award, Eye, Filter, RefreshCw, Sparkles, Building2, Phone, Mail, HelpCircle, Gift
} from 'lucide-react'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'

interface VendorsSectionProps {
  vendors: Vendor[]
  vendorLeads: VendorLead[]
  onAddVendor: (vendor: Partial<Vendor>) => Promise<void>
  onUpdateVendor: (id: string, vendor: Partial<Vendor>) => Promise<void>
  onDeleteVendor: (id: string) => Promise<void>
  onUpdateLeadStatus?: (leadId: string, status: 'new' | 'contacted' | 'redeemed' | 'expired') => Promise<void>
  onDeleteLead?: (leadId: string) => Promise<void>
  refreshData?: () => void
}

const DEFAULT_REWARDS: VendorReward[] = [
  { id: '1', title: '10% OFF Booking', code: 'OFF10', color: '#EF4444', description: '10% discount on next holiday package' },
  { id: '2', title: 'Free Hotel Voucher', code: 'FREEPASS', color: '#F59E0B', description: 'Complimentary room upgrade' },
  { id: '3', title: '₹1000 Discount', code: 'SAVE1000', color: '#10B981', description: 'Flat ₹1000 cashback' },
  { id: '4', title: 'Surprise Gift Pass', code: 'GIFT2025', color: '#3B82F6', description: 'Special travel gift hamper' },
  { id: '5', title: '20% OFF Package', code: 'LUCKY20', color: '#8B5CF6', description: '20% discount on luxury trips' },
]

export default function VendorsSection({
  vendors,
  vendorLeads,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
  onUpdateLeadStatus,
  onDeleteLead,
  refreshData
}: VendorsSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'vendors' | 'leads'>('vendors')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Form Modal State
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [formData, setFormData] = useState<Partial<Vendor>>({})
  const [isSaving, setIsSaving] = useState(false)

  // QR Modal State
  const [selectedQrVendor, setSelectedQrVendor] = useState<Vendor | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  // Lead Filters
  const [leadVendorFilter, setLeadVendorFilter] = useState('all')
  const [leadStatusFilter, setLeadStatusFilter] = useState('all')
  const [leadSearchTerm, setLeadSearchTerm] = useState('')

  // Generate QR Code when QR modal is opened
  useEffect(() => {
    if (selectedQrVendor) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://travelzada.com'
      const targetUrl = `${origin}/v/${selectedQrVendor.vendorKey}`

      QRCode.toDataURL(targetUrl, { width: 300, margin: 2 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err))
    }
  }, [selectedQrVendor])

  // Open Form to create vendor
  const handleOpenAddForm = () => {
    setEditingVendor(null)
    const randomKey = `vnd_${Math.random().toString(36).substring(2, 8)}`
    setFormData({
      name: '',
      vendorKey: randomKey,
      contactPerson: '',
      phone: '',
      email: '',
      category: 'Travel Partner',
      address: '',
      logoUrl: '',
      active: true,
      questionData: {
        question: 'Which of the following is Travelzada\'s top beach destination?',
        options: ['Bali', 'Paris', 'Tokyo', 'Swiss Alps'],
        correctOptionIndex: 0
      },
      rewards: [...DEFAULT_REWARDS],
      totalScans: 0,
      totalClaims: 0,
    })
    setShowFormModal(true)
  }

  // Open Form to edit vendor
  const handleOpenEditForm = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setFormData({
      ...vendor,
      questionData: vendor.questionData || {
        question: 'Sample Question?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctOptionIndex: 0
      },
      rewards: vendor.rewards && vendor.rewards.length === 5 ? vendor.rewards : [...DEFAULT_REWARDS]
    })
    setShowFormModal(true)
  }

  // Save Vendor Form Submit
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.vendorKey) {
      alert('Vendor Name and Vendor Key are required.')
      return
    }

    setIsSaving(true)
    try {
      if (editingVendor?.id) {
        await onUpdateVendor(editingVendor.id, formData)
      } else {
        await onAddVendor(formData)
      }
      setShowFormModal(false)
      if (refreshData) refreshData()
    } catch (err: any) {
      console.error('Error saving vendor:', err)
      alert('Failed to save vendor. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete Vendor
  const handleDeleteVendor = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete vendor "${name}"?`)) {
      try {
        await onDeleteVendor(id)
        if (refreshData) refreshData()
      } catch (e) {
        alert('Failed to delete vendor.')
      }
    }
  }

  // Export Vendor Leads to Excel
  const handleExportLeadsExcel = () => {
    if (!filteredLeads.length) {
      alert('No leads available to export.')
      return
    }

    const exportData = filteredLeads.map((l) => ({
      'Lead ID': l.id || '',
      'User Name': l.userName,
      'User Phone': l.userPhone,
      'User Email': l.userEmail || '',
      'Vendor Name': l.vendorName,
      'Vendor Key': l.vendorKey,
      'Reward Title': l.rewardTitle,
      'Reward Code': l.rewardCode || '',
      'Claim Voucher Code': l.claimCode,
      'Status': l.status.toUpperCase(),
      'Claimed Date': l.createdAt ? new Date(l.createdAt).toLocaleString() : '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendor Leads CRM')
    XLSX.writeFile(workbook, `Vendor_Leads_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Filtered Vendors list
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendorKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCat = categoryFilter === 'all' || v.category === categoryFilter
    return matchesSearch && matchesCat
  })

  // Filtered Leads list
  const filteredLeads = vendorLeads.filter((l) => {
    const matchesVendor = leadVendorFilter === 'all' || l.vendorId === leadVendorFilter || l.vendorKey === leadVendorFilter
    const matchesStatus = leadStatusFilter === 'all' || l.status === leadStatusFilter
    const matchesSearch = l.userName.toLowerCase().includes(leadSearchTerm.toLowerCase()) ||
      l.userPhone.includes(leadSearchTerm) ||
      l.claimCode.toLowerCase().includes(leadSearchTerm.toLowerCase())
    return matchesVendor && matchesStatus && matchesSearch
  })

  // Stat calculations
  const totalScansAll = vendors.reduce((acc, v) => acc + (v.totalScans || 0), 0)
  const totalClaimsAll = vendorLeads.length

  return (
    <div className="space-y-6">
      
      {/* Top Header & Section Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-amber-500" />
            Vendor Marketing & Rewards CRM
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage vendor QR campaigns, quiz questions, 5-reward spin wheels, and captured lead records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-1 rounded-xl flex">
            <button
              onClick={() => setActiveSubTab('vendors')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeSubTab === 'vendors' ? 'bg-amber-500 text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vendors ({vendors.length})
            </button>
            <button
              onClick={() => setActiveSubTab('leads')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeSubTab === 'leads' ? 'bg-amber-500 text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Leads CRM ({vendorLeads.length})
            </button>
          </div>

          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Vendors</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{vendors.length}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Total QR Scans</p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">{totalScansAll}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Rewards Claimed</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{totalClaimsAll}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Claim Conversion Rate</p>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">
              {totalScansAll > 0 ? `${((totalClaimsAll / totalScansAll) * 100).toFixed(1)}%` : '0%'}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SUBTAB 1: VENDORS LIST & MANAGEMENT */}
      {activeSubTab === 'vendors' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Controls Bar */}
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendor name, key..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Categories</option>
                <option value="Travel Partner">Travel Partner</option>
                <option value="Hotel & Resort">Hotel & Resort</option>
                <option value="Tour Operator">Tour Operator</option>
                <option value="Restaurant / Cafe">Restaurant / Cafe</option>
              </select>

              {refreshData && (
                <button
                  onClick={refreshData}
                  className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200"
                  title="Refresh List"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Vendors Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Vendor Info</th>
                  <th className="px-6 py-4">Unique Key</th>
                  <th className="px-6 py-4">Contact Person</th>
                  <th className="px-6 py-4 text-center">QR Scans</th>
                  <th className="px-6 py-4 text-center">Rewards Claimed</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No vendors found. Click "+ Add Vendor" to create your first vendor campaign.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50/50 transition">
                      
                      {/* Name & Logo */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {vendor.logoUrl ? (
                            <img src={vendor.logoUrl} alt={vendor.name} className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-base">
                              {vendor.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900">{vendor.name}</p>
                            <p className="text-xs text-gray-400">{vendor.category || 'General Partner'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Unique Key */}
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-indigo-600">
                        <span className="bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                          {vendor.vendorKey}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800">{vendor.contactPerson || 'N/A'}</p>
                        <p className="text-xs text-gray-400">{vendor.phone}</p>
                      </td>

                      {/* Scans */}
                      <td className="px-6 py-4 text-center font-bold text-gray-800">
                        {vendor.totalScans || 0}
                      </td>

                      {/* Claims */}
                      <td className="px-6 py-4 text-center font-bold text-emerald-600">
                        {vendor.totalClaims || vendorLeads.filter(l => l.vendorKey === vendor.vendorKey || l.vendorId === vendor.id).length}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                          vendor.active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {vendor.active !== false ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {vendor.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* QR Code view */}
                          <button
                            onClick={() => setSelectedQrVendor(vendor)}
                            className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition"
                            title="View & Download QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditForm(vendor)}
                            className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition"
                            title="Edit Vendor & Quiz/Rewards"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => vendor.id && handleDeleteVendor(vendor.id, vendor.name)}
                            className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition"
                            title="Delete Vendor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: VENDOR LEADS CRM */}
      {activeSubTab === 'leads' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Controls Bar */}
          <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search user name, phone, code..."
                  value={leadSearchTerm}
                  onChange={(e) => setLeadSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Vendor Filter */}
              <select
                value={leadVendorFilter}
                onChange={(e) => setLeadVendorFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.vendorKey}>{v.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Lead Statuses</option>
                <option value="new">New Claim</option>
                <option value="contacted">Contacted</option>
                <option value="redeemed">Redeemed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <button
              onClick={handleExportLeadsExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow active:scale-95"
            >
              <Download className="w-4 h-4" /> Export to Excel
            </button>
          </div>

          {/* Leads Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Reward Won</th>
                  <th className="px-6 py-4">Claim Code</th>
                  <th className="px-6 py-4">Claim Date</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No vendor leads recorded yet. Scan vendor QR codes to claim test rewards.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/50 transition">
                      
                      {/* User */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{lead.userName}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-amber-500" /> {lead.userPhone}
                        </p>
                        {lead.userEmail && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-blue-400" /> {lead.userEmail}
                          </p>
                        )}
                      </td>

                      {/* Vendor */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800">{lead.vendorName}</p>
                        <p className="text-xs font-mono text-gray-400">{lead.vendorKey}</p>
                      </td>

                      {/* Reward */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 text-xs">
                          🎁 {lead.rewardTitle}
                        </span>
                        {lead.rewardCode && (
                          <p className="text-[10px] text-gray-400 font-mono mt-1">Code: {lead.rewardCode}</p>
                        )}
                      </td>

                      {/* Claim Code */}
                      <td className="px-6 py-4 font-mono text-xs font-bold text-emerald-600">
                        {lead.claimCode}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'Just now'}
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-6 py-4 text-center">
                        <select
                          value={lead.status || 'new'}
                          onChange={(e) => {
                            if (lead.id && onUpdateLeadStatus) {
                              onUpdateLeadStatus(lead.id, e.target.value as any)
                            }
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full border focus:outline-none cursor-pointer ${
                            lead.status === 'redeemed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : lead.status === 'contacted'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="new">🆕 New Claim</option>
                          <option value="contacted">📞 Contacted</option>
                          <option value="redeemed">✅ Redeemed</option>
                          <option value="expired">❌ Expired</option>
                        </select>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => lead.id && onDeleteLead && onDeleteLead(lead.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORM MODAL: ADD / EDIT VENDOR */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingVendor ? `Edit Vendor: ${editingVendor.name}` : 'Create New Vendor Campaign'}
                </h3>
                <p className="text-xs text-gray-500">
                  Set basic details, quiz question, and 5 spin wheel rewards.
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="space-y-6">
              
              {/* SECTION 1: BASIC INFO */}
              <div>
                <h4 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> 1. Vendor Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Travels Delhi"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Unique Key / Slug *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. vnd_royal_delhi"
                      value={formData.vendorKey || ''}
                      onChange={(e) => setFormData({ ...formData, vendorKey: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category || 'Travel Partner'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    >
                      <option value="Travel Partner">Travel Partner</option>
                      <option value="Hotel & Resort">Hotel & Resort</option>
                      <option value="Tour Operator">Tour Operator</option>
                      <option value="Restaurant / Cafe">Restaurant / Cafe</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Sharma"
                      value={formData.contactPerson || ''}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone / WhatsApp Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +919876543210"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="vendor@example.com"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Logo URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={formData.logoUrl || ''}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: QUIZ QUESTION SETUP */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" /> 2. Quiz Question (4 Options, 1 Answer)
                </h4>

                <div className="space-y-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Question Text *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter question for user e.g. Which destination is famous for Eiffel Tower?"
                      value={formData.questionData?.question || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          questionData: {
                            ...formData.questionData!,
                            question: e.target.value,
                            options: formData.questionData?.options || ['', '', '', ''],
                            correctOptionIndex: formData.questionData?.correctOptionIndex ?? 0,
                          },
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[0, 1, 2, 3].map((idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={formData.questionData?.correctOptionIndex === idx}
                          onChange={() =>
                            setFormData({
                              ...formData,
                              questionData: {
                                ...formData.questionData!,
                                correctOptionIndex: idx,
                              },
                            })
                          }
                          className="w-4 h-4 text-blue-600"
                          title="Mark as correct answer"
                        />
                        <input
                          type="text"
                          required
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          value={formData.questionData?.options?.[idx] || ''}
                          onChange={(e) => {
                            const newOptions = [...(formData.questionData?.options || ['', '', '', ''])]
                            newOptions[idx] = e.target.value
                            setFormData({
                              ...formData,
                              questionData: {
                                ...formData.questionData!,
                                options: newOptions,
                              },
                            })
                          }}
                          className={`w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none ${
                            formData.questionData?.correctOptionIndex === idx
                              ? 'border-emerald-500 ring-1 ring-emerald-500'
                              : 'border-gray-200'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 italic">
                    💡 Select the radio button next to the option that is the correct answer.
                  </p>
                </div>
              </div>

              {/* SECTION 3: 5 REWARDS SETUP */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Gift className="w-4 h-4" /> 3. Spin Wheel Rewards (Exactly 5 Rewards)
                </h4>

                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const currentReward = formData.rewards?.[i] || DEFAULT_REWARDS[i]
                    return (
                      <div key={i} className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <input
                            type="color"
                            value={currentReward.color || '#EF4444'}
                            onChange={(e) => {
                              const newRewards = [...(formData.rewards || [...DEFAULT_REWARDS])]
                              newRewards[i] = { ...newRewards[i], color: e.target.value }
                              setFormData({ ...formData, rewards: newRewards })
                            }}
                            className="w-8 h-8 rounded border-none cursor-pointer"
                            title="Wheel Slice Color"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            required
                            placeholder="Reward Title (e.g. 15% OFF)"
                            value={currentReward.title}
                            onChange={(e) => {
                              const newRewards = [...(formData.rewards || [...DEFAULT_REWARDS])]
                              newRewards[i] = { ...newRewards[i], title: e.target.value }
                              setFormData({ ...formData, rewards: newRewards })
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:outline-none"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Promo Code (e.g. BALI15)"
                            value={currentReward.code || ''}
                            onChange={(e) => {
                              const newRewards = [...(formData.rewards || [...DEFAULT_REWARDS])]
                              newRewards[i] = { ...newRewards[i], code: e.target.value.toUpperCase() }
                              setFormData({ ...formData, rewards: newRewards })
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:outline-none"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Terms/Description"
                            value={currentReward.description || ''}
                            onChange={(e) => {
                              const newRewards = [...(formData.rewards || [...DEFAULT_REWARDS])]
                              newRewards[i] = { ...newRewards[i], description: e.target.value }
                              setFormData({ ...formData, rewards: newRewards })
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow transition active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Create Vendor Campaign'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* QR CODE DISPLAY & DOWNLOAD MODAL */}
      {selectedQrVendor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl">
            
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-500" /> Vendor QR Code
              </h3>
              <button
                onClick={() => setSelectedQrVendor(null)}
                className="w-7 h-7 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Scan this QR Code to test the customer Quiz & Spin Wheel landing page.
            </p>

            {/* QR Image Box */}
            <div className="bg-gradient-to-b from-amber-500 to-amber-600 p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center text-white mb-4">
              <p className="text-base font-black tracking-wide uppercase mb-2">{selectedQrVendor.name}</p>
              
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={selectedQrVendor.name}
                  className="w-52 h-52 rounded-xl bg-white p-2 border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-52 h-52 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                  Loading QR Code...
                </div>
              )}

              <p className="text-[11px] text-amber-100 font-mono mt-3">
                Key: <span className="font-bold underline">{selectedQrVendor.vendorKey}</span>
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <a
                href={qrDataUrl}
                download={`${selectedQrVendor.vendorKey}_qrcode.png`}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm shadow"
              >
                <Download className="w-4 h-4" /> Download QR Code (PNG)
              </a>

              <a
                href={`/v/${selectedQrVendor.vendorKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Quiz Landing Page Directly
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
