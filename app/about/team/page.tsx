import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Breadcrumbs from '@/components/Breadcrumbs'
import Image from 'next/image'

export const metadata: Metadata = {
    title: 'Our Team | Travelzada',
    description: 'Meet the travel experts behind Travelzada. We plan trips that actually make sense for couples.',
    alternates: {
        canonical: '/about/team',
    },
}

const teamMembers = [
    {
        name: 'Rishabh Khandelwal',
        role: 'Founder & CEO',
        bio: 'Rishabh founded Travelzada after seeing how overwhelming and transactional travel planning had become for couples. With a deep focus on operations and real-world execution, he leads the charge in building an AI-assisted travel platform that prioritizes thoughtful itineraries over impulsive bookings.',
        image: '/images/destinations/rajasthan.jpg', // Placeholder image from public dir
        expertise: ['Strategic Planning', 'Travel Operations', 'AI Integration'],
        social: {
            linkedin: 'https://linkedin.com/company/travelzada',
        }
    },
    {
        name: 'Kazi Alsan Ahmed',
        role: 'Travel Content Head & Destination Expert',
        bio: 'Kazi heads our content and destination research. As a seasoned travel writer, he ensures our guides are not just informative, but factually accurate and genuinely helpful. From navigating IndiGo flight cancellations to finding the best off-beat spots in Bali, Kazi\'s expertise powers our entire blog.',
        image: '/images/destinations/bali.jpg', // Placeholder image
        expertise: ['Destination Research', 'Travel Journalism', 'Safety & Compliance'],
        social: {
            linkedin: 'https://linkedin.com/company/travelzada',
        }
    }
]

export default function TeamPage() {
    return (
        <main className="min-h-screen bg-white">
            <Header />
            <div className="bg-white px-4 md:px-12 pt-20 lg:pt-24 pb-3 border-b border-gray-100">
                <div className="max-w-4xl mx-auto">
                    <Breadcrumbs items={[
                        { name: 'Home', url: '/' },
                        { name: 'About', url: '/about' },
                        { name: 'Our Team' }
                    ]} />
                </div>
            </div>

            <section className="relative py-20 px-4 md:px-12 bg-[#fcfcfc] border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">Meet Our Team</h1>
                    <p className="text-xl text-gray-600">
                        The travel experts ensuring your next trip is planned thoughtfully and honestly.
                    </p>
                </div>
            </section>

            <section className="py-20 px-4 md:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12">
                        {teamMembers.map((member) => (
                            <div key={member.name} className="bg-white border text-left border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{member.name}</h2>
                                        <p className="text-primary font-medium mt-1">{member.role}</p>
                                    </div>

                                    <p className="text-gray-600 leading-relaxed">
                                        {member.bio}
                                    </p>

                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Areas of Expertise</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {member.expertise.map((skill) => (
                                                <span key={skill} className="bg-primary/5 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/10">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    )
}
