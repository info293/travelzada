'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from 'firebase/auth'

interface AuthContextType {
  currentUser: User | null
  loading: boolean
  signup: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isAdmin: boolean
  permissions: string[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// SSR-safe default values - used during server rendering
const defaultAuthContext: AuthContextType = {
  currentUser: null,
  loading: true,
  signup: async () => { throw new Error('Auth not available during SSR') },
  login: async () => { throw new Error('Auth not available during SSR') },
  logout: async () => { throw new Error('Auth not available during SSR') },
  loginWithGoogle: async () => { throw new Error('Auth not available during SSR') },
  resetPassword: async () => { throw new Error('Auth not available during SSR') },
  isAdmin: false,
  permissions: [],
}

export function useAuth() {
  const context = useContext(AuthContext)
  // Return default context during SSR to prevent bailout
  // The real context will be available after hydration
  if (context === undefined) {
    return defaultAuthContext
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])

  useEffect(() => {
    let unsubscribe: () => void

    const initAuth = async () => {
      if (typeof window === 'undefined') {
        setLoading(false)
        return
      }

      try {
        const { auth, db } = await import('@/lib/firebase')
        const { onAuthStateChanged } = await import('firebase/auth')
        const { doc, getDoc } = await import('firebase/firestore')

        if (!auth) {
          setLoading(false)
          return
        }

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          setCurrentUser(user)
          if (user && user.email) {
            try {
              if (db) {
                const userDoc = await getDoc(doc(db, 'users', user.uid))

                if (userDoc.exists()) {
                  const userData = userDoc.data()
                  const userRole = userData.role || 'user'
                  setIsAdmin(userRole === 'admin')
                  setPermissions(userData.permissions || [])
                  console.log('Admin check from Firestore:', {
                    email: user.email,
                    role: userRole,
                    isAdmin: userRole === 'admin',
                    permissions: userData.permissions
                  })
                } else {
                  // Fallback: Check if email contains 'admin' or matches specific admin emails
                  const adminEmails = ['admin@travelzada.com', 'admin@example.com']
                  const emailLower = user.email.toLowerCase()
                  const isAdminEmail = adminEmails.includes(emailLower) ||
                    emailLower.split('@')[0].includes('admin')
                  setIsAdmin(isAdminEmail)
                  setPermissions([]) // No specific permissions for fallback admin
                  console.log('Admin check (fallback):', { email: user.email, isAdmin: isAdminEmail })
                }
              }
            } catch (error) {
              console.error('Error checking admin status:', error)
              // Fallback: Check if email contains 'admin' or matches specific admin emails
              const adminEmails = ['admin@travelzada.com', 'admin@example.com']
              const emailLower = user.email.toLowerCase()
              const isAdminEmail = adminEmails.includes(emailLower) ||
                emailLower.split('@')[0].includes('admin')
              setIsAdmin(isAdminEmail)
              setPermissions([])
            }
          } else {
            setIsAdmin(false)
            setPermissions([])
          }
          setLoading(false)
        })
      } catch (error) {
        console.error('Error initializing auth:', error)
        setLoading(false)
      }
    }

    initAuth()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  async function signup(email: string, password: string) {
    const { auth, db } = await import('@/lib/firebase')
    const { createUserWithEmailAndPassword } = await import('firebase/auth')
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')

    if (!auth || !db) throw new Error('Firebase not initialized')

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    // Create user document in Firestore
    if (userCredential.user) {
      const userDoc = {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || '',
        photoURL: userCredential.user.photoURL || '',
        role: 'user' as const,
        createdAt: serverTimestamp(),
        isActive: true,
        permissions: [] as string[]
      }

      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), userDoc)
      } catch (error) {
        console.error('Error creating user document:', error)
      }
    }
  }

  async function login(email: string, password: string) {
    const { auth, db } = await import('@/lib/firebase')
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore')

    if (!auth || !db) throw new Error('Firebase not initialized')

    const userCredential = await signInWithEmailAndPassword(auth, email, password)

    // Update last login in Firestore
    if (userCredential.user) {
      const userRef = doc(db, 'users', userCredential.user.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        await setDoc(userRef, {
          lastLogin: serverTimestamp(),
        }, { merge: true })
      } else {
        // Create user document if it doesn't exist
        const userDoc = {
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || '',
          photoURL: userCredential.user.photoURL || '',
          role: 'user' as const,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isActive: true,
          permissions: [] as string[]
        }
        await setDoc(userRef, userDoc)
      }
    }
  }

  async function logout() {
    const { auth } = await import('@/lib/firebase')
    const { signOut } = await import('firebase/auth')

    if (!auth) throw new Error('Firebase not initialized')
    await signOut(auth)
  }

  async function loginWithGoogle() {
    const { auth, db } = await import('@/lib/firebase')
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
    const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore')

    if (!auth || !db) throw new Error('Firebase not initialized')

    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(auth, provider)

    // Create or update user document in Firestore
    if (userCredential.user) {
      const userRef = doc(db, 'users', userCredential.user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        // Create new user document
        const userDoc = {
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || '',
          photoURL: userCredential.user.photoURL || '',
          role: 'user' as const,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isActive: true,
          permissions: [] as string[]
        }
        await setDoc(userRef, userDoc)
      } else {
        // Update last login
        await setDoc(userRef, {
          lastLogin: serverTimestamp(),
          displayName: userCredential.user.displayName || userSnap.data().displayName,
          photoURL: userCredential.user.photoURL || userSnap.data().photoURL,
        }, { merge: true })
      }
    }
  }

  async function resetPassword(email: string) {
    const { auth } = await import('@/lib/firebase')
    const { sendPasswordResetEmail } = await import('firebase/auth')

    if (!auth) throw new Error('Firebase not initialized')
    await sendPasswordResetEmail(auth, email)
  }

  const value: AuthContextType = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    loginWithGoogle,
    resetPassword,
    isAdmin,
    permissions,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
