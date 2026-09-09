'use client'

import React, { useState, useEffect } from 'react'
import { Vendor, VendorLead, VendorReward, VendorQuestion } from './types'
import {
  Plus, Search, QrCode, Edit, Trash2, CheckCircle2, XCircle, Download, ExternalLink,
  Users, Award, Eye, Filter, RefreshCw, Building2, Phone, Mail, HelpCircle, Gift,
  Clock, ArrowUp, ArrowDown, Image as ImageIcon, Gamepad2, Brain, Target, Wind, Dices, Sparkles, Zap
} from 'lucide-react'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import ImageUploader from './ImageUploader'

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

const EIGHT_SLICE_COLORS = [
  '#FF7A00', // Orange
  '#00B4D8', // Teal
  '#FF4D6D', // Coral
  '#E63946', // Crimson
  '#70E000', // Lime
  '#7B2CBF', // Purple
  '#0077B6', // Cyan
  '#D90429', // Magenta
]

const DEFAULT_REWARDS: VendorReward[] = [
  { id: '1', title: '10% OFF Booking', code: 'OFF10', color: '#FF7A00', description: '10% discount on next holiday package' },
  { id: '2', title: 'Free Hotel Pass', code: 'HOTELPASS', color: '#00B4D8', description: 'Complimentary room upgrade' },
  { id: '3', title: '₹1000 Cashback', code: 'SAVE1000', color: '#FF4D6D', description: 'Flat ₹1000 cashback' },
  { id: '4', title: 'Surprise Gift', code: 'GIFT2025', color: '#E63946', description: 'Special travel gift hamper' },
  { id: '5', title: '20% OFF Package', code: 'LUCKY20', color: '#70E000', description: '20% discount on luxury trips' },
  { id: '6', title: '₹500 Flight Off', code: 'FLY500', color: '#7B2CBF', description: 'Instant flight discount' },
  { id: '7', title: 'Jackpot Pass', code: 'JACKPOT', color: '#0077B6', description: 'Exclusive VIP jackpot pass' },
  { id: '8', title: 'Bonus Gift Pass', code: 'BONUS', color: '#D90429', description: 'Bonus voucher pass' },
]

const DEFAULT_QUESTIONS: VendorQuestion[] = [
  {
    id: '1',
    question: "Which of the following is Travelzada's top beach destination?",
    options: ['Bali', 'Paris', 'Tokyo', 'Swiss Alps'],
    optionImages: [
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=500&q=80',
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&q=80',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500&q=80',
      'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=500&q=80',
    ],
    correctOptionIndex: 0,
    timerSeconds: 15,
  },
  {
    id: '2',
    question: 'Which continent has the largest land area?',
    options: ['Asia', 'Africa', 'Europe', 'North America'],
    optionImages: ['', '', '', ''],
    correctOptionIndex: 0,
    timerSeconds: 15,
  },
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

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)

  // Open Form to create vendor
  const handleOpenAddForm = () => {
    setEditingVendor(null)
    const randomKey = `vnd_${Math.random().toString(36).substring(2, 8)}`
    const initialQuestions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS))
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
      rewardType: 'spinner',
      gameType: 'quiz',
      gameTimerSeconds: 60,
      gameImages: ['', '', '', '', '', ''],
      questions: initialQuestions,
      questionData: initialQuestions[0],
      rewards: [...DEFAULT_REWARDS],
      totalScans: 0,
      totalClaims: 0,
    })
    setActiveQuestionIndex(0)
    setShowFormModal(true)
  }

  // Open Form to edit vendor
  const handleOpenEditForm = (vendor: Vendor) => {
    setEditingVendor(vendor)
    let questionsList: VendorQuestion[] = []

    if (vendor.questions && vendor.questions.length > 0) {
      questionsList = vendor.questions
    } else if (vendor.questionData) {
      questionsList = [vendor.questionData]
    } else {
      questionsList = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS))
    }

    setFormData({
      ...vendor,
      rewardType: vendor.rewardType || 'spinner',
      gameType: vendor.gameType || 'quiz',
      gameTimerSeconds: vendor.gameTimerSeconds || 60,
      gameImages: vendor.gameImages || ['', '', '', '', '', ''],
      questions: questionsList,
      questionData: questionsList[0] || DEFAULT_QUESTIONS[0],
      rewards: vendor.rewards && vendor.rewards.length >= 6 ? vendor.rewards : [...DEFAULT_REWARDS]
    })
    setActiveQuestionIndex(0)
    setShowFormModal(true)
  }

  // Save Vendor Form Submit
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.vendorKey) {
      alert('Vendor Name and Vendor Key are required.')
      return
    }

    const currentQuestions = formData.questions && formData.questions.length > 0
      ? formData.questions
      : JSON.parse(JSON.stringify(DEFAULT_QUESTIONS))

    const dataToSave = {
      ...formData,
      rewardType: formData.rewardType || 'spinner',
      gameType: formData.gameType || 'quiz',
      gameTimerSeconds: formData.gameTimerSeconds || 60,
      gameImages: formData.gameImages || [],
      questions: currentQuestions,
      questionData: currentQuestions[0], // fallback for legacy consumers
    }

    setIsSaving(true)
    try {
      if (editingVendor?.id) {
        await onUpdateVendor(editingVendor.id, dataToSave)
      } else {
        await onAddVendor(dataToSave)
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
                  <th className="px-6 py-4 text-center">Primary Game</th>
                  <th className="px-6 py-4 text-center">Reward Claim</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      No vendors found. Click &quot;+ Add Vendor&quot; to create your first vendor campaign.
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

                      {/* Primary Interactive Game Badge */}
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 border ${
                          vendor.gameType === 'memory'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : vendor.gameType === 'taptarget'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : vendor.gameType === 'balloon'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : vendor.gameType === 'slots'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : vendor.gameType === 'treasure'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : vendor.gameType === 'whack'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : vendor.gameType === 'highlow'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : vendor.gameType === 'wheel'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {vendor.gameType === 'memory'
                            ? '🧠 Memory Match'
                            : vendor.gameType === 'taptarget'
                            ? '🎯 Tap Target'
                            : vendor.gameType === 'balloon'
                            ? '💨 Balloon Pop'
                            : vendor.gameType === 'slots'
                            ? '🎰 Lucky Slots'
                            : vendor.gameType === 'treasure'
                            ? '🎁 Treasure Chest'
                            : vendor.gameType === 'whack'
                            ? '🔨 Whack-A-Luggage'
                            : vendor.gameType === 'highlow'
                            ? '🎴 Higher or Lower'
                            : vendor.gameType === 'wheel'
                            ? '🎡 Fortune Wheel'
                            : '❓ Travel Quiz'}
                        </span>
                      </td>

                      {/* Reward Game Badge */}
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 border ${
                          vendor.rewardType === 'scratch'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {vendor.rewardType === 'scratch' ? '🎫 Scratch Card' : '🎰 Spin Wheel'}
                        </span>
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Logo (Upload Photo or Paste URL)</label>
                    <div className="space-y-2">
                      <ImageUploader
                        value={formData.logoUrl || ''}
                        onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                        compact
                        placeholder="Upload Vendor Logo Photo"
                      />
                      <input
                        type="url"
                        placeholder="Or paste direct logo URL (https://...)"
                        value={formData.logoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PRIMARY GAME SELECTION (Quiz, Memory Match, Tap Target, Balloon Pop) */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4" /> 1. Interactive Game Type
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Choose the primary game users play on your landing page before unlocking rewards.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Quiz Option */}
                  <label
                    className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      (formData.gameType || 'quiz') === 'quiz'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gameType"
                      value="quiz"
                      checked={(formData.gameType || 'quiz') === 'quiz'}
                      onChange={() => setFormData({ ...formData, gameType: 'quiz' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          <HelpCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm">Travel Quiz</h5>
                          <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Questions & Answers
                          </span>
                        </div>
                      </div>
                      {(formData.gameType || 'quiz') === 'quiz' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2">
                      Multiple choice travel questions with countdown timers.
                    </p>
                  </label>

                  {/* Memory Match Option */}
                  <label
                    className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.gameType === 'memory'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gameType"
                      value="memory"
                      checked={formData.gameType === 'memory'}
                      onChange={() => setFormData({ ...formData, gameType: 'memory' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          <Brain className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm">Memory Match</h5>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Card Pair Flipping
                          </span>
                        </div>
                      </div>
                      {formData.gameType === 'memory' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2">
                      Flip and match 6 pairs of travel destination cards before time runs out.
                    </p>
                  </label>

                  {/* Tap Target Option */}
                  <label
                    className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.gameType === 'taptarget'
                        ? 'border-amber-600 bg-amber-50/50 shadow-md ring-2 ring-amber-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gameType"
                      value="taptarget"
                      checked={formData.gameType === 'taptarget'}
                      onChange={() => setFormData({ ...formData, gameType: 'taptarget' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          <Target className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm">Tap the Target</h5>
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Fast Target Popping
                          </span>
                        </div>
                      </div>
                      {formData.gameType === 'taptarget' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2">
                      Fast-paced target popping game — tap circles before they vanish!
                    </p>
                  </label>

                  {/* Balloon Pop Option */}
                  <label
                    className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.gameType === 'balloon'
                        ? 'border-rose-600 bg-rose-50/50 shadow-md ring-2 ring-rose-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gameType"
                      value="balloon"
                      checked={formData.gameType === 'balloon'}
                      onChange={() => setFormData({ ...formData, gameType: 'balloon' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          <Wind className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm">Balloon Pop</h5>
                          <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Hold to Inflate
                          </span>
                        </div>
                      </div>
                      {formData.gameType === 'balloon' && (
                        <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2">
                      Hold to inflate balloon for points, but don&apos;t let it pop!
                    </p>
                  </label>

                  {/* Lucky Slots Option */}
                  <label
                    className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.gameType === 'slots'
                        ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gameType"
                      value="slots"
                      checked={formData.gameType === 'slots'}
                      onChange={() => setFormData({ ...formData, gameType: 'slots' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          <Dices className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm">Lucky Slots</h5>
                          <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            3-Reel Slot Machine
                          </span>
                        </div>
                      </div>
                      {formData.gameType === 'slots' && (
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2">
                      Spin 3 travel reels for 3x matching jackpot combinations!
                    </p>
                  </label>

                  {/* Mystery Treasure Chest Option */}
                  <label
                    className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.gameType === 'treasure'
                        ? 'border-teal-600 bg-teal-50/50 shadow-md ring-2 ring-teal-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gameType"
                      value="treasure"
                      checked={formData.gameType === 'treasure'}
                      onChange={() => setFormData({ ...formData, gameType: 'treasure' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm">Treasure Chest</h5>
                          <span className="text-[10px] text-teal-700 font-bold bg-teal-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Mystery Unboxing
                          </span>
                        </div>
                      </div>
                      {formData.gameType === 'treasure' && (
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2">
                      Unbox 3 mystery island treasure chests to reveal hidden rewards!
                    </p>
                  </label>

                  {/* Whack-A-Suitcase Option */}
                  <label
                    className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.gameType === 'whack'
                        ? 'border-orange-600 bg-orange-50/50 shadow-md ring-2 ring-orange-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gameType"
                      value="whack"
                      checked={formData.gameType === 'whack'}
                      onChange={() => setFormData({ ...formData, gameType: 'whack' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm">Whack-A-Suitcase</h5>
                          <span className="text-[10px] text-orange-700 font-bold bg-orange-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Fast Reflex Arcade
                          </span>
                        </div>
                      </div>
                      {formData.gameType === 'whack' && (
                        <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2">
                      Tap popping suitcases, passports & trophies before they disappear!
                    </p>
                  </label>

                  {/* Higher or Lower Card Option */}
                  <label
                    className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.gameType === 'highlow'
                        ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gameType"
                      value="highlow"
                      checked={formData.gameType === 'highlow'}
                      onChange={() => setFormData({ ...formData, gameType: 'highlow' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          <ArrowUp className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm">Higher or Lower</h5>
                          <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Card Rank Predictor
                          </span>
                        </div>
                      </div>
                      {formData.gameType === 'highlow' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2">
                      Predict if the next travel card is Higher or Lower for streak multipliers!
                    </p>
                  </label>

                  {/* Fortune Wheel Option */}
                  <label
                    className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.gameType === 'wheel'
                        ? 'border-amber-600 bg-amber-50/50 shadow-md ring-2 ring-amber-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gameType"
                      value="wheel"
                      checked={formData.gameType === 'wheel'}
                      onChange={() => setFormData({ ...formData, gameType: 'wheel' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs sm:text-sm">Fortune Wheel</h5>
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Arcade Luck Wheel
                          </span>
                        </div>
                      </div>
                      {formData.gameType === 'wheel' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2">
                      Spin 8-slice fortune wheel to land points & 1000 PTS jackpot!
                    </p>
                  </label>
                </div>

                {/* GAME TIME DURATION & CUSTOM GAME IMAGES CONFIGURATION */}
                <div className="mt-4 p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" /> Game Duration Limit (Time Allowed)
                    </label>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Set how much time the user gets to complete this game (up to 5 minutes).
                    </p>
                    <select
                      value={formData.gameTimerSeconds || 60}
                      onChange={(e) => setFormData({ ...formData, gameTimerSeconds: Number(e.target.value) })}
                      className="w-full sm:w-64 px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 shadow-2xs"
                    >
                      <option value={30}>30 Seconds (Fast)</option>
                      <option value={45}>45 Seconds (Standard)</option>
                      <option value={60}>60 Seconds (1 Minute)</option>
                      <option value={120}>120 Seconds (2 Minutes)</option>
                      <option value={180}>180 Seconds (3 Minutes)</option>
                      <option value={300}>300 Seconds (5 Minutes MAX)</option>
                    </select>
                  </div>

                  {/* CUSTOM GAME PHOTOS (For Memory Match / Tap Target) */}
                  {formData.gameType && formData.gameType !== 'quiz' && (
                    <div className="border-t border-indigo-100 pt-3 space-y-2">
                      <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-indigo-600" /> Custom Game Images (Optional - Up to 6 Photos)
                      </label>
                      <p className="text-[11px] text-gray-500">
                        Upload custom photos for your game (e.g. Memory Match card pairs or Target icons). If left blank, default destination photos will be used.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                        {[0, 1, 2, 3, 4, 5].map((imgIdx) => {
                          const currentImgs = formData.gameImages || ['', '', '', '', '', '']
                          return (
                            <div key={imgIdx} className="bg-white p-2 rounded-xl border border-gray-200 space-y-1">
                              <span className="text-[10px] font-bold text-gray-500 block">
                                {formData.gameType === 'memory' ? `Card Pair #${imgIdx + 1}` : `Photo #${imgIdx + 1}`}
                              </span>
                              <ImageUploader
                                value={currentImgs[imgIdx] || ''}
                                onChange={(url) => {
                                  const updated = [...currentImgs]
                                  updated[imgIdx] = url
                                  setFormData({ ...formData, gameImages: updated })
                                }}
                                folder="game_images"
                                placeholder={`Photo ${imgIdx + 1}`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* REWARD EXPERIENCE GAME TYPE SELECTION */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Gift className="w-4 h-4" /> Reward Claim Game (After Winning)
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Choose what reward game users see after completing the primary game.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      (formData.rewardType || 'spinner') === 'spinner'
                        ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rewardType"
                      value="spinner"
                      checked={(formData.rewardType || 'spinner') === 'spinner'}
                      onChange={() => setFormData({ ...formData, rewardType: 'spinner' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                          🎰
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-sm">Spin Wheel (Spinner)</h5>
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Spin Wheel Game
                          </span>
                        </div>
                      </div>
                      {(formData.rewardType || 'spinner') === 'spinner' && (
                        <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-2.5">
                      Users spin an 8-slice arcade wheel to win guaranteed travel rewards.
                    </p>
                  </label>

                  <label
                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.rewardType === 'scratch'
                        ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-400/30'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rewardType"
                      value="scratch"
                      checked={formData.rewardType === 'scratch'}
                      onChange={() => setFormData({ ...formData, rewardType: 'scratch' })}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                          🎫
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-sm">Scratch Card</h5>
                          <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                            Golden Scratch Layer
                          </span>
                        </div>
                      </div>
                      {formData.rewardType === 'scratch' && (
                        <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-2.5">
                      Users swipe/drag across a golden canvas scratch layer to reveal their prize.
                    </p>
                  </label>
                </div>
              </div>

              {/* SECTION 2: MULTI-QUESTION QUIZ SETUP (Only if Game Type is Quiz) */}
              {(formData.gameType || 'quiz') === 'quiz' && (
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4" /> 2. Quiz Questions Setup ({formData.questions?.length || 0} Questions)
                      </h4>
                      <p className="text-xs text-gray-500">
                        Add multiple quiz questions. Each question has a countdown timer, 4 choices & 1 correct answer.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newQuestions = [...(formData.questions || [])]
                        const nextNum = newQuestions.length + 1
                        newQuestions.push({
                          id: `q_${Date.now()}`,
                          question: `New Question ${nextNum}?`,
                          options: ['Option A', 'Option B', 'Option C', 'Option D'],
                          optionImages: ['', '', '', ''],
                          correctOptionIndex: 0,
                          timerSeconds: 15,
                          imageUrl: '',
                        })
                        setFormData({ ...formData, questions: newQuestions })
                        setActiveQuestionIndex(newQuestions.length - 1)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Question
                    </button>
                </div>

                {/* Active Question Editor Card */}
                {formData.questions && formData.questions[activeQuestionIndex] && (
                  <div className="space-y-4 bg-blue-50/50 p-4 sm:p-5 rounded-2xl border border-blue-100 relative">
                    
                    {/* Header Controls: Reorder & Delete */}
                    <div className="flex items-center justify-between gap-2 border-b border-blue-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white font-black text-xs">
                          Question {activeQuestionIndex + 1} of {formData.questions.length}
                        </span>

                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={activeQuestionIndex === 0}
                          onClick={() => {
                            const list = [...formData.questions!]
                            const temp = list[activeQuestionIndex]
                            list[activeQuestionIndex] = list[activeQuestionIndex - 1]
                            list[activeQuestionIndex - 1] = temp
                            setFormData({ ...formData, questions: list })
                            setActiveQuestionIndex(activeQuestionIndex - 1)
                          }}
                          className="p-1 rounded bg-white text-gray-600 border hover:bg-gray-100 disabled:opacity-30"
                          title="Move Question Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={activeQuestionIndex === formData.questions.length - 1}
                          onClick={() => {
                            const list = [...formData.questions!]
                            const temp = list[activeQuestionIndex]
                            list[activeQuestionIndex] = list[activeQuestionIndex + 1]
                            list[activeQuestionIndex + 1] = temp
                            setFormData({ ...formData, questions: list })
                            setActiveQuestionIndex(activeQuestionIndex + 1)
                          }}
                          className="p-1 rounded bg-white text-gray-600 border hover:bg-gray-100 disabled:opacity-30"
                          title="Move Question Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Delete Question */}
                      {formData.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete Question ${activeQuestionIndex + 1}?`)) {
                              const list = formData.questions!.filter((_, i) => i !== activeQuestionIndex)
                              setFormData({ ...formData, questions: list })
                              setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1))
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Question
                        </button>
                      )}
                    </div>

                    {/* Question Text & Timer Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-8">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Question Text *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Which of the following is Travelzada's top beach destination?"
                          value={formData.questions[activeQuestionIndex].question || ''}
                          onChange={(e) => {
                            const list = [...formData.questions!]
                            list[activeQuestionIndex] = { ...list[activeQuestionIndex], question: e.target.value }
                            setFormData({ ...formData, questions: list })
                          }}
                          className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-medium text-gray-900"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" /> Time Limit (Seconds)
                        </label>
                        <select
                          value={formData.questions[activeQuestionIndex].timerSeconds || 15}
                          onChange={(e) => {
                            const list = [...formData.questions!]
                            list[activeQuestionIndex] = { ...list[activeQuestionIndex], timerSeconds: parseInt(e.target.value) || 15 }
                            setFormData({ ...formData, questions: list })
                          }}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-blue-500"
                        >
                          <option value={10}>10 Seconds (Fast)</option>
                          <option value={15}>15 Seconds (Standard)</option>
                          <option value={20}>20 Seconds (Extended)</option>
                          <option value={30}>30 Seconds (Relaxed)</option>
                        </select>
                      </div>
                    </div>

                    {/* Optional Question Header Image */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Question Banner Photo (Optional Header Photo)
                      </label>
                      <div className="space-y-2">
                        {formData.questions[activeQuestionIndex].imageUrl && (
                          <div className="relative w-full h-28 rounded-xl overflow-hidden border border-blue-200 bg-gray-100">
                            <img
                              src={formData.questions[activeQuestionIndex].imageUrl}
                              alt="Question Banner Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <ImageUploader
                          value={formData.questions[activeQuestionIndex].imageUrl || ''}
                          onChange={(url) => {
                            const list = [...formData.questions!]
                            list[activeQuestionIndex] = { ...list[activeQuestionIndex], imageUrl: url }
                            setFormData({ ...formData, questions: list })
                          }}
                          compact
                          placeholder="Upload Question Banner Image"
                        />
                        <input
                          type="url"
                          placeholder="Or paste direct photo URL (https://...)"
                          value={formData.questions[activeQuestionIndex].imageUrl || ''}
                          onChange={(e) => {
                            const list = [...formData.questions!]
                            list[activeQuestionIndex] = { ...list[activeQuestionIndex], imageUrl: e.target.value }
                            setFormData({ ...formData, questions: list })
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* 4 Options Grid */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-2">
                        Options & Option Photos (Select 1 Correct Answer)
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((optIdx) => {
                          const optLetter = String.fromCharCode(65 + optIdx)
                          const currentOptText = formData.questions![activeQuestionIndex].options?.[optIdx] || ''
                          const currentOptImg = formData.questions![activeQuestionIndex].optionImages?.[optIdx] || ''
                          const isCorrect = formData.questions![activeQuestionIndex].correctOptionIndex === optIdx

                          return (
                            <div
                              key={optIdx}
                              className={`p-3 bg-white border rounded-2xl space-y-2 shadow-xs transition ${
                                isCorrect ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                                    {optLetter}
                                  </span>
                                  <span className="text-xs font-bold text-gray-800">Option {optLetter}</span>
                                </div>

                                <label className="flex items-center gap-1 text-[11px] font-bold cursor-pointer text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition">
                                  <input
                                    type="radio"
                                    name={`correctOption_${activeQuestionIndex}`}
                                    checked={isCorrect}
                                    onChange={() => {
                                      const list = [...formData.questions!]
                                      list[activeQuestionIndex] = { ...list[activeQuestionIndex], correctOptionIndex: optIdx }
                                      setFormData({ ...formData, questions: list })
                                    }}
                                    className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  {isCorrect ? '✓ Correct' : 'Set Correct'}
                                </label>
                              </div>

                              <div>
                                <input
                                  type="text"
                                  required
                                  placeholder={`Option ${optLetter} Title (e.g. Bali)`}
                                  value={currentOptText}
                                  onChange={(e) => {
                                    const list = [...formData.questions!]
                                    const newOpts = [...(list[activeQuestionIndex].options || ['', '', '', ''])]
                                    newOpts[optIdx] = e.target.value
                                    list[activeQuestionIndex] = { ...list[activeQuestionIndex], options: newOpts }
                                    setFormData({ ...formData, questions: list })
                                  }}
                                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              {/* Option Photo Upload & Live Thumbnail Preview */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-semibold text-gray-500">
                                  Option {optLetter} Photo (Upload or Paste URL)
                                </label>

                                {currentOptImg ? (
                                  <div className="relative w-full h-16 sm:h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                                    <img
                                      src={currentOptImg}
                                      alt={`Option ${optLetter} Preview`}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const list = [...formData.questions!]
                                        const newImgs = [...(list[activeQuestionIndex].optionImages || ['', '', '', ''])]
                                        newImgs[optIdx] = ''
                                        list[activeQuestionIndex] = { ...list[activeQuestionIndex], optionImages: newImgs }
                                        setFormData({ ...formData, questions: list })
                                      }}
                                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded-full text-[10px] font-bold"
                                      title="Remove Image"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <ImageUploader
                                    value={currentOptImg}
                                    onChange={(url) => {
                                      const list = [...formData.questions!]
                                      const newImgs = [...(list[activeQuestionIndex].optionImages || ['', '', '', ''])]
                                      newImgs[optIdx] = url
                                      list[activeQuestionIndex] = { ...list[activeQuestionIndex], optionImages: newImgs }
                                      setFormData({ ...formData, questions: list })
                                    }}
                                    compact
                                    placeholder={`Upload Option ${optLetter} Photo`}
                                  />
                                )}

                                <input
                                  type="url"
                                  placeholder="Or paste direct image URL (https://...)"
                                  value={currentOptImg}
                                  onChange={(e) => {
                                    const list = [...formData.questions!]
                                    const newImgs = [...(list[activeQuestionIndex].optionImages || ['', '', '', ''])]
                                    newImgs[optIdx] = e.target.value
                                    list[activeQuestionIndex] = { ...list[activeQuestionIndex], optionImages: newImgs }
                                    setFormData({ ...formData, questions: list })
                                  }}
                                  className="w-full px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-mono focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 italic pt-1">
                      💡 Tip: Adding photos to options displays high-res image cards (like Image 1)! If left blank, options render as sleek pill choices.
                    </p>

                  </div>
                )}
              </div>
              )}

              {/* SECTION 3: REWARDS SETUP WITH WEIGHTED PROBABILITY ALGORITHM */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Gift className="w-4 h-4" /> 3. {formData.rewardType === 'scratch' ? 'Scratch Card' : 'Spin Wheel'} Reward Offers ({(formData.rewards || DEFAULT_REWARDS).length} Offers)
                    </h4>
                    <p className="text-xs text-gray-500">
                      Configure offer titles, promo codes & win weights. Higher weight = higher chance of winning (e.g. Weight 1 out of 1000 = 1 in 1000 times).
                    </p>
                  </div>
                  {(formData.rewards?.length || 0) < 8 && (
                    <button
                      type="button"
                      onClick={() => {
                        const current = formData.rewards || [...DEFAULT_REWARDS]
                        if (current.length < 8) {
                          const nextId = String(current.length + 1)
                          const newReward: VendorReward = {
                            id: nextId,
                            title: `Offer ${nextId}`,
                            code: `OFFER${nextId}`,
                            color: EIGHT_SLICE_COLORS[current.length % EIGHT_SLICE_COLORS.length],
                            description: 'Special reward offer',
                            probability: 10,
                          }
                          setFormData({ ...formData, rewards: [...current, newReward] })
                        }
                      }}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Offer
                    </button>
                  )}
                </div>

                {/* Calculate Total Weight for percentage preview */}
                {(() => {
                  const currentRewardsList = formData.rewards || DEFAULT_REWARDS
                  const totalWeight = currentRewardsList.reduce((sum, r) => sum + (r.probability !== undefined && r.probability > 0 ? Number(r.probability) : 10), 0)

                  return (
                    <div className="space-y-3 mt-3">
                      {currentRewardsList.map((currentReward, i) => {
                        const currentProb = currentReward.probability !== undefined && currentReward.probability > 0 ? Number(currentReward.probability) : 10
                        const pctOdds = totalWeight > 0 ? ((currentProb / totalWeight) * 100).toFixed(1) : '0'

                        return (
                          <div key={i} className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                              {/* Index & Slice Color */}
                              <div className="sm:col-span-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center shrink-0">
                                  {i + 1}
                                </span>
                                <input
                                  type="color"
                                  value={currentReward.color || EIGHT_SLICE_COLORS[i % EIGHT_SLICE_COLORS.length]}
                                  onChange={(e) => {
                                    const newRewards = [...currentRewardsList]
                                    newRewards[i] = { ...newRewards[i], color: e.target.value }
                                    setFormData({ ...formData, rewards: newRewards })
                                  }}
                                  className="w-8 h-8 rounded border-none cursor-pointer shrink-0"
                                  title="Offer Slice / Card Color"
                                />
                              </div>

                              {/* Title */}
                              <div className="sm:col-span-3">
                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Offer Title *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. ₹1000 Cashback"
                                  value={currentReward.title}
                                  onChange={(e) => {
                                    const newRewards = [...currentRewardsList]
                                    newRewards[i] = { ...newRewards[i], title: e.target.value }
                                    setFormData({ ...formData, rewards: newRewards })
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:border-purple-500"
                                />
                              </div>

                              {/* Promo Code */}
                              <div className="sm:col-span-3">
                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Promo Code</label>
                                <input
                                  type="text"
                                  placeholder="e.g. SAVE1000"
                                  value={currentReward.code || ''}
                                  onChange={(e) => {
                                    const newRewards = [...currentRewardsList]
                                    newRewards[i] = { ...newRewards[i], code: e.target.value.toUpperCase() }
                                    setFormData({ ...formData, rewards: newRewards })
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:border-purple-500"
                                />
                              </div>

                              {/* Terms/Description */}
                              <div className="sm:col-span-3">
                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Description</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Flat ₹1000 cashback"
                                  value={currentReward.description || ''}
                                  onChange={(e) => {
                                    const newRewards = [...currentRewardsList]
                                    newRewards[i] = { ...newRewards[i], description: e.target.value }
                                    setFormData({ ...formData, rewards: newRewards })
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                                />
                              </div>

                              {/* Remove Button */}
                              <div className="sm:col-span-1 flex justify-end">
                                {currentRewardsList.length > 4 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newRewards = currentRewardsList.filter((_, idx) => idx !== i)
                                      setFormData({ ...formData, rewards: newRewards })
                                    }}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                    title="Remove Offer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Win Odds Weight & Calculated Odds Bar */}
                            <div className="flex items-center gap-3 pt-1 border-t border-purple-100/60 text-xs">
                              <div className="flex items-center gap-2">
                                <label className="text-[11px] font-bold text-purple-900 shrink-0">
                                  ⚖️ Win Weight (Odds):
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={10000}
                                  value={currentProb}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1)
                                    const newRewards = [...currentRewardsList]
                                    newRewards[i] = { ...newRewards[i], probability: val }
                                    setFormData({ ...formData, rewards: newRewards })
                                  }}
                                  className="w-20 px-2 py-1 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-500"
                                />
                              </div>

                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex-1 h-2 bg-purple-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, Math.max(1, Number(pctOdds)))}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-bold text-purple-700 shrink-0">
                                  {pctOdds}% odds ({currentProb}/{totalWeight})
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
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
