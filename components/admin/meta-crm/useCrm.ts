'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { CRM_COLLECTION, type CrmRecord, type CrmUserRef } from '@/lib/metaLeadsCrm'

/** Live map of every CRM record, keyed by Meta lead ID. */
export function useCrmRecords() {
  const [records, setRecords] = useState<Record<string, CrmRecord>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, CRM_COLLECTION),
      (snap) => {
        const map: Record<string, CrmRecord> = {}
        snap.forEach((d) => (map[d.id] = d.data() as CrmRecord))
        setRecords(map)
        setLoading(false)
      },
      (err) => {
        console.error('Error loading Meta lead CRM records:', err)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  return { records, loading }
}

/** Live CRM record for one lead (null until created). */
export function useCrmRecord(leadId: string) {
  const [record, setRecord] = useState<CrmRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, CRM_COLLECTION, leadId),
      (snap) => {
        setRecord(snap.exists() ? (snap.data() as CrmRecord) : null)
        setLoading(false)
      },
      (err) => {
        console.error('Error loading CRM record:', err)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [leadId])

  return { record, loading }
}

/** Users who can work Meta leads: admins and users with the "leads" permission. */
export function useSalesTeam() {
  const [team, setTeam] = useState<CrmUserRef[]>([])

  useEffect(() => {
    getDocs(collection(db, 'users'))
      .then((snap) => {
        const members: CrmUserRef[] = []
        snap.forEach((d) => {
          const u = d.data()
          const canWorkLeads = u.role === 'admin' || (Array.isArray(u.permissions) && u.permissions.includes('leads'))
          if (canWorkLeads && u.isActive !== false) {
            members.push({ uid: d.id, name: u.displayName || u.name || u.email || 'Unnamed' })
          }
        })
        setTeam(members.sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch((err) => console.error('Error loading sales team:', err))
  }, [])

  return team
}

/** The logged-in user as a CRM reference (who did an action). */
export function useCurrentUserRef(): CrmUserRef | null {
  const { currentUser } = useAuth()
  return useMemo(
    () =>
      currentUser
        ? { uid: currentUser.uid, name: currentUser.displayName || currentUser.email || 'Unknown' }
        : null,
    [currentUser]
  )
}
