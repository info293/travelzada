import { redirect } from 'next/navigation'

// Customer designs live at /design/[id]; the bare path goes to the vendor's list of shared designs
export default function DesignIndexPage() {
  redirect('/ai-images/designs')
}
