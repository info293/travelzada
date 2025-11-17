const brands = ['Aman', 'One&Only', 'Belmond', 'Six Senses', 'Emirates', 'Qatar Airways']

export default function TrustedBy() {
  return (
    <section className="py-12 md:py-14 px-4 md:px-8 lg:px-12 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Trusted By</p>
            <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-2">
              Preferred partners across the world
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 w-full">
            {brands.map((brand) => (
              <div
                key={brand}
                className="h-12 flex items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-sm font-semibold text-gray-500 tracking-wide"
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

