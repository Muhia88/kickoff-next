"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import Spinner from '@/components/Spinner';
import { Filter, X, ChevronDown } from 'lucide-react';

// --- Types ---
type Product = any; // Using any for now to match existing usage, strict types can be added later
type FilterOption = { id: number; name: string };

// --- FilterAccordion Component ---
const FilterAccordion = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-gray-200 py-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between group"
                aria-expanded={isOpen}
            >
                <span className="text-sm font-bold uppercase tracking-wide text-gray-900 group-hover:text-red-700 transition-colors">{title}</span>
                <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                <div className="pt-4">{children}</div>
            </div>
        </div>
    );
};

const CategoryPage = ({ params }: { params: Promise<{ name: string }> }) => {
    // 1. Unwrap params
    const [categoryName, setCategoryName] = useState<string | null>(null);
    useEffect(() => {
        params.then(p => setCategoryName(decodeURIComponent(p.name)));
    }, [params]);

    // 2. State
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters & Sort State
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [sort, setSort] = useState('best_selling'); // best_selling, price_asc, price_desc, name_asc, name_desc
    const [filters, setFilters] = useState({
        minPrice: '',
        maxPrice: '',
        brandIds: [] as number[],
        productClassIds: [] as number[]
    });

    // Available Filter Options (fetched based on category)
    const [availableBrands, setAvailableBrands] = useState<FilterOption[]>([]);
    const [availableProductClasses, setAvailableProductClasses] = useState<FilterOption[]>([]);

    // 3. Fetch Category ID & Filter Options
    useEffect(() => {
        if (!categoryName) return;

        const initCategory = async () => {
            setLoading(true);
            try {
                // A. Get Category ID
                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .select('id')
                    .ilike('name', categoryName)
                    .single();

                if (catError || !catData) throw new Error(`Category '${categoryName}' not found`);
                setCategoryId(catData.id);

                // B. Fetch Available Brands for this Category
                // Logic: Fetch brands where an associated product exists in this category
                const { data: brandsData } = await supabase
                    .from('brands')
                    .select('*, products!inner(category_id)')
                    .eq('products.category_id', catData.id);

                if (brandsData) {
                    // Deduplicate by ID
                    const uniqueBrands = Array.from(new Map(brandsData.map((b: any) => [b.id, { id: b.id, name: b.name }])).values());
                    setAvailableBrands(uniqueBrands.sort((a, b) => a.name.localeCompare(b.name)));
                }

                // C. Fetch Available Product Classes
                const { data: classesData } = await supabase
                    .from('product_classes')
                    .select('*, products!inner(category_id)')
                    .eq('products.category_id', catData.id);

                if (classesData) {
                    const uniqueClasses = Array.from(new Map(classesData.map((c: any) => [c.id, { id: c.id, name: c.name }])).values());
                    setAvailableProductClasses(uniqueClasses.sort((a, b) => a.name.localeCompare(b.name)));
                }

            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };

        initCategory();
    }, [categoryName]);

    // 4. Fetch Products when CategoryId, Filters, or Sort changes
    useEffect(() => {
        if (!categoryId) return;

        const fetchProducts = async () => {
            setLoading(true);
            setError(null);
            try {
                let query = supabase
                    .from('products')
                    .select('*, brands(name), product_classes(name), product_names(name)')
                    .eq('category_id', categoryId);

                // Apply Filters
                if (filters.brandIds.length > 0) {
                    query = query.in('brand_id', filters.brandIds);
                }
                if (filters.productClassIds.length > 0) {
                    query = query.in('product_class_id', filters.productClassIds);
                }
                if (filters.minPrice) {
                    query = query.gte('price', Number(filters.minPrice));
                }
                if (filters.maxPrice) {
                    query = query.lte('price', Number(filters.maxPrice));
                }

                // Apply Sort
                switch (sort) {
                    case 'price_asc':
                        query = query.order('price', { ascending: true });
                        break;
                    case 'price_desc':
                        query = query.order('price', { ascending: false });
                        break;
                    case 'name_asc': // approximation using main product name if 'name' column is reliable
                        query = query.order('name', { ascending: true });
                        break;
                    case 'name_desc':
                        query = query.order('name', { ascending: false });
                        break;
                    default: // best_selling fallback (needs logic, usually sales count. For now default ID or explicit col)
                        // If we don't have a 'sales_count' column, we can just order by ID or Name
                        query = query.order('id', { ascending: true });
                }

                const { data, error } = await query;
                if (error) throw error;
                setProducts(data || []);

            } catch (err: any) {
                setError(err.message || 'Failed to fetch products');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [categoryId, filters, sort]);


    // -- Handlers --
    const toggleFilter = (type: 'brandIds' | 'productClassIds', id: number) => {
        setFilters(prev => {
            const current = prev[type];
            const exists = current.includes(id);
            const updated = exists ? current.filter(x => x !== id) : [...current, id];
            return { ...prev, [type]: updated };
        });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({ minPrice: '', maxPrice: '', brandIds: [], productClassIds: [] });
        setMobileFiltersOpen(false);
    };

    const activeFilterCount = filters.brandIds.length + filters.productClassIds.length + (filters.minPrice ? 1 : 0) + (filters.maxPrice ? 1 : 0);


    if (!categoryName && loading) return <Spinner />;

    return (
        <div className="bg-gray-50 min-h-screen py-8 sm:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-gray-200">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-gray-900 capitalize tracking-tight">{categoryName}</h1>
                        <p className="text-gray-500 text-sm mt-1">{products.length} Products Found</p>
                    </div>

                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        {/* Mobile Filter Toggle */}
                        <button
                            onClick={() => setMobileFiltersOpen(true)}
                            className="lg:hidden inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full">{activeFilterCount}</span>
                            )}
                        </button>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer hover:bg-gray-50"
                            >
                                <option value="best_selling">Best Selling</option>
                                <option value="name_asc">Alphabetical (A-Z)</option>
                                <option value="name_desc">Alphabetical (Z-A)</option>
                                <option value="price_asc">Price (Low to High)</option>
                                <option value="price_desc">Price (High to Low)</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-8 items-start">

                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block w-64 bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-24">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">Filters</h3>
                            {activeFilterCount > 0 && (
                                <button onClick={clearFilters} className="text-xs text-red-600 font-medium hover:underline">Clear All</button>
                            )}
                        </div>

                        {/* Price Filter */}
                        <FilterAccordion title="Price" defaultOpen={true}>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">KES</span>
                                    <input
                                        type="number" name="minPrice" placeholder="Min" value={filters.minPrice} onChange={handlePriceChange}
                                        className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-black focus:border-black"
                                    />
                                </div>
                                <span className="text-gray-400">-</span>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">KES</span>
                                    <input
                                        type="number" name="maxPrice" placeholder="Max" value={filters.maxPrice} onChange={handlePriceChange}
                                        className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-black focus:border-black"
                                    />
                                </div>
                            </div>
                        </FilterAccordion>

                        {/* Brand Filter */}
                        {availableBrands.length > 0 && (
                            <FilterAccordion title="Brand">
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 customize-scrollbar">
                                    {availableBrands.map(b => (
                                        <label key={b.id} className="flex items-center gap-2.5 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="peer h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                                    checked={filters.brandIds.includes(b.id)}
                                                    onChange={() => toggleFilter('brandIds', b.id)}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-600 group-hover:text-black">{b.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </FilterAccordion>
                        )}

                        {/* Product Class Filter */}
                        {availableProductClasses.length > 0 && (
                            <FilterAccordion title="Class">
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 customize-scrollbar">
                                    {availableProductClasses.map(c => (
                                        <label key={c.id} className="flex items-center gap-2.5 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="peer h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                                    checked={filters.productClassIds.includes(c.id)}
                                                    onChange={() => toggleFilter('productClassIds', c.id)}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-600 group-hover:text-black">{c.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </FilterAccordion>
                        )}
                    </aside>

                    {/* Product Grid */}
                    <div className="flex-1">
                        {loading && products.length === 0 ? (
                            <div className="flex justify-center py-20"><Spinner /></div>
                        ) : error ? (
                            <div className="text-center py-12 bg-red-50 rounded-lg text-red-600 border border-red-100">
                                {error.includes("not found") ? "Category not found." : error}
                            </div>
                        ) : (
                            products.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <Filter className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">No products found</h3>
                                    <p className="text-gray-500 mb-6">Try adjusting your filters or search criteria.</p>
                                    <button onClick={clearFilters} className="text-red-700 font-medium hover:underline">Clear all filters</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {products.map(p => (
                                        <ProductCard key={p.id} product={p} />
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileFiltersOpen && (
                <div className="fixed inset-0 z-50 lg:hidden font-sans">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
                    <aside className="absolute inset-y-0 right-0 w-80 bg-white shadow-2xl flex flex-col animate-slide-in">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                            <button onClick={() => setMobileFiltersOpen(false)} className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {/* Mobile Price Filter */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 mb-3">Price Range</h3>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number" name="minPrice" placeholder="Min" value={filters.minPrice} onChange={handlePriceChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="number" name="maxPrice" placeholder="Max" value={filters.maxPrice} onChange={handlePriceChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Mobile Brand Filter */}
                            {availableBrands.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 mb-3">Brand</h3>
                                    <div className="space-y-3">
                                        {availableBrands.map(b => (
                                            <label key={b.id} className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded border-gray-300 text-black focus:ring-black"
                                                    checked={filters.brandIds.includes(b.id)}
                                                    onChange={() => toggleFilter('brandIds', b.id)}
                                                />
                                                <span className="text-gray-700">{b.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <hr className="border-gray-100" />

                            {/* Mobile Class Filter */}
                            {availableProductClasses.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 mb-3">Class</h3>
                                    <div className="space-y-3">
                                        {availableProductClasses.map(c => (
                                            <label key={c.id} className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded border-gray-300 text-black focus:ring-black"
                                                    checked={filters.productClassIds.includes(c.id)}
                                                    onChange={() => toggleFilter('productClassIds', c.id)}
                                                />
                                                <span className="text-gray-700">{c.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                            <button onClick={clearFilters} className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-white transition-colors">
                                Clear All
                            </button>
                            <button onClick={() => setMobileFiltersOpen(false)} className="flex-1 py-3 px-4 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-900 transition-colors shadow-lg">
                                Show Results
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
};

export default CategoryPage;
