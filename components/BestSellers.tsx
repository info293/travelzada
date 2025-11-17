import Link from 'next/link'

const bestSellers = [
  {
    name: 'Kerala Backwaters',
    price: '₹20,500',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80',
  },
  {
    name: 'Royal Jaipur',
    price: '₹15,000',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&q=80',
  },
  {
    name: 'Mystical Manali',
    price: '₹18,900',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  },
  {
    name: 'Goa Beach Bliss',
    price: '₹12,500',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
  },
]

export default function BestSellers() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {bestSellers.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div
              className="h-48 bg-cover bg-center"
              style={{ backgroundImage: `url(${item.image})` }}
            ></div>
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2">{item.name}</h3>
              <p className="text-primary font-semibold mb-3">
                Starting From {item.price}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <Link
        href="/destinations"
        className="inline-block bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-dark transition-colors"
      >
        See Our Hand-Picked Best Sellers
      </Link>
    </div>
  )
}


