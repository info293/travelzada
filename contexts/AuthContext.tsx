'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

// Helper to ensure auth is available
const getAuthInstance = () => {
  if (typeof window === 'undefined' || !auth) {
    throw new Error('Firebase Auth is not available. Make sure you are using this on the client side.')
  }
  return auth
}

// Helper to ensure db is available
const getDbInstance = () => {
  if (typeof window === 'undefined' || !db) {
    throw new Error('Firestore is not available. Make sure you are using this on the client side.')
  }
  return db
}

interface AuthContextType {
  currentUser: User | null
  loading: boolean
  signup: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      // Check if user is admin from Firestore
      if (user && user.email) {
        try {
          const dbInstance = getDbInstance()
          const userDoc = await getDoc(doc(dbInstance, 'users', user.uid))
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const userRole = userData.role || 'user'
            setIsAdmin(userRole === 'admin')
            console.log('Admin check from Firestore:', { email: user.email, role: userRole, isAdmin: userRole === 'admin' })
          } else {
            // Fallback: Check if email contains 'admin' or matches specific admin emails
            const adminEmails = ['admin@travelzada.com', 'admin@example.com']
            const emailLower = user.email.toLowerCase()
            const isAdminEmail = adminEmails.includes(emailLower) || 
                                emailLower.split('@')[0].includes('admin')
            setIsAdmin(isAdminEmail)
            console.log('Admin check (fallback):', { email: user.email, isAdmin: isAdminEmail })
          }
        } catch (error) {
          console.error('Error checking admin status:', error)
          // Fallback: Check if email contains 'admin' or matches specific admin emails
          const adminEmails = ['admin@travelzada.com', 'admin@example.com']
          const emailLower = user.email.toLowerCase()
          const isAdminEmail = adminEmails.includes(emailLower) || 
                              emailLower.split('@')[0].includes('admin')
          setIsAdmin(isAdminEmail)
        }
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  async function signup(email: string, password: string) {
    const authInstance = getAuthInstance()
    const userCredential = await createUserWithEmailAndPassword(authInstance, email, password)
    
    // Create user document in Firestore
    if (userCredential.user) {
      const userDoc = {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || '',
        photoURL: userCredential.user.photoURL || '',
        role: 'user' as const,
        createdAt: serverTimestamp(),
        isActive: true,
      }
      
      try {
        const dbInstance = getDbInstance()
        await setDoc(doc(dbInstance, 'users', userCredential.user.uid), userDoc)
      } catch (error) {
        console.error('Error creating user document:', error)
      }
    }
  }

  async function login(email: string, password: string) {
    const authInstance = getAuthInstance()
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password)
    
    // Update last login in Firestore
    if (userCredential.user) {
      const dbInstance = getDbInstance()
      const userRef = doc(dbInstance, 'users', userCredential.user.uid)
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
        }
        await setDoc(userRef, userDoc)
      }
    }
  }

  async function logout() {
    const authInstance = getAuthInstance()
    await signOut(authInstance)
  }

  async function loginWithGoogle() {
    const authInstance = getAuthInstance()
    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(authInstance, provider)
    
    // Create or update user document in Firestore
    if (userCredential.user) {
      const dbInstance = getDbInstance()
      const userRef = doc(dbInstance, 'users', userCredential.user.uid)
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
    const authInstance = getAuthInstance()
    await sendPasswordResetEmail(authInstance, email)
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
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}

