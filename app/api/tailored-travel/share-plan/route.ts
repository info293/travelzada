import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { wizardData, selectedPackage, initialChatMessages } = body;

        if (!wizardData || !selectedPackage) {
            return NextResponse.json(
                { error: 'Missing required data (wizardData or selectedPackage)' },
                { status: 400 }
            );
        }

        // Initialize vote counts on the selected package to 0
        const packageWithVotes = {
            ...selectedPackage,
            votes: {
                up: 0,
                down: 0
            }
        };

        const shareData = {
            wizardData,
            package: packageWithVotes,
            messages: initialChatMessages || [], // Save the current state of the chat
            createdAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp(),
            status: 'active'
        };

        const sharedPlansRef = collection(db, 'shared_plans');
        const docRef = await addDoc(sharedPlansRef, shareData);

        // Generate the shareable link
        const currentHost = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const shareUrl = `${currentHost}/shared-plan/${docRef.id}`;

        return NextResponse.json({
            success: true,
            planId: docRef.id,
            shareUrl
        });

    } catch (error: any) {
        console.error('Error sharing plan:', error);
        return NextResponse.json(
            { error: 'An error occurred while generating the share link.' },
            { status: 500 }
        );
    }
}
