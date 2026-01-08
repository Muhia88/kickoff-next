import Link from 'next/link';

const ProductCategories = () => {
    const categories = [
        {
            name: 'WHISKY',
            image: '/whiskey/jack_daniels.png',
            href: '/whisky'
        },
        {
            name: 'GIN',
            image: '/gin/Gilbeys_london.png',
            href: '/gin'
        },
        {
            name: 'BEER',
            image: '/beer/guiness.png',
            href: '/beer'
        },
        {
            name: 'VODKA',
            image: '/vodka/smirnoff_vodka.png',
            href: '/vodka'
        },
        {
            name: 'COGNAC',
            image: '/cognac/martell.png',
            href: '/cognac'
        },
        {
            name: 'WINE',
            image: '/wine/4th_Street_Red.png',
            href: '/wine'
        }
    ];

    return (
        <section className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {categories.map((category) => (
                        <Link
                            key={category.name}
                            href={`/category/${encodeURIComponent(category.name)}`}
                            className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 block aspect-square"
                        >
                            <div className="relative w-full h-full">
                                <img
                                    src={category.image}
                                    alt={category.name}
                                    className="w-full h-full object-cover"
                                />
                                <div
                                    className="absolute inset-0 bg-black/50"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white/90 px-4 py-2">
                                        <h3 className="text-black text-sm font-bold text-center">
                                            {category.name}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProductCategories;
