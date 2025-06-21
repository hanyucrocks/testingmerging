"use client"

import { useState } from "react"
import { ProductCard } from "./components/ProductCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ShoppingCart, Heart, Menu } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

// Product data
const products = [
  {
    id: 1,
    name: "Premium Wireless Headphones",
    price: 129.99,
    originalPrice: 199.99,
    rating: 4.5,
    reviews: 1247,
    image: "/headphones-1.jpg"
  },
  {
    id: 2,
    name: "Smart Watch Series 5",
    price: 299.99,
    originalPrice: 399.99,
    rating: 4.8,
    reviews: 892,
    image: "/watch-1.jpg"
  },
  {
    id: 3,
    name: "Wireless Earbuds Pro",
    price: 149.99,
    originalPrice: 199.99,
    rating: 4.6,
    reviews: 2156,
    image: "/earbuds-1.jpg"
  },
  {
    id: 4,
    name: "Portable Bluetooth Speaker",
    price: 79.99,
    originalPrice: 99.99,
    rating: 4.3,
    reviews: 567,
    image: "/speaker-1.jpg"
  }
]

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#131921] text-white">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <div className="w-24 h-8 relative">
                <Image
                  src="/amazon-logo-white.png"
                  alt="Amazon"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="flex">
                <select className="bg-gray-100 text-gray-800 px-2 rounded-l-md border-r border-gray-300">
                  <option>All</option>
                  <option>Electronics</option>
                  <option>Books</option>
                  <option>Fashion</option>
                </select>
                <Input
                  type="text"
                  placeholder="Search Amazon"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-none border-gray-300 focus:ring-orange-500"
                />
                <Button className="bg-orange-400 hover:bg-orange-500 rounded-l-none rounded-r-md">
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Right Navigation */}
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="text-gray-300">Hello, Sign in</p>
                <p className="font-bold">Account & Lists</p>
              </div>
              <div className="text-sm">
                <p className="text-gray-300">Returns</p>
                <p className="font-bold">& Orders</p>
              </div>
              <Button variant="ghost" className="text-white hover:bg-[#232F3E]">
                <ShoppingCart className="h-6 w-6" />
                <span className="ml-1">0</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Navigation */}
      <div className="bg-[#232F3E] text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center space-x-4 py-2">
            <Button variant="ghost" className="text-white hover:bg-[#37475A]">
              <Menu className="h-5 w-5 mr-1" />
              All
            </Button>
            <Link href="#" className="text-sm hover:text-gray-300">Today's Deals</Link>
            <Link href="#" className="text-sm hover:text-gray-300">Customer Service</Link>
            <Link href="#" className="text-sm hover:text-gray-300">Registry</Link>
            <Link href="#" className="text-sm hover:text-gray-300">Gift Cards</Link>
            <Link href="#" className="text-sm hover:text-gray-300">Sell</Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div className="w-full h-[600px] relative">
          <Image
            src="/hero-banner.jpg"
            alt="Amazon Hero"
            fill
            className="object-cover"
          />
        </div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-0 -translate-y-0 text-center text-yellow-200">
          
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Featured Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#232F3E] text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4">Get to Know Us</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm hover:text-gray-300">Careers</Link></li>
                <li><Link href="#" className="text-sm hover:text-gray-300">Blog</Link></li>
                <li><Link href="#" className="text-sm hover:text-gray-300">About Amazon</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Make Money with Us</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm hover:text-gray-300">Sell products on Amazon</Link></li>
                <li><Link href="#" className="text-sm hover:text-gray-300">Sell on Amazon Business</Link></li>
                <li><Link href="#" className="text-sm hover:text-gray-300">Sell apps on Amazon</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Amazon Payment Products</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm hover:text-gray-300">Amazon Business Card</Link></li>
                <li><Link href="#" className="text-sm hover:text-gray-300">Shop with Points</Link></li>
                <li><Link href="#" className="text-sm hover:text-gray-300">Reload Your Balance</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Let Us Help You</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm hover:text-gray-300">Amazon and COVID-19</Link></li>
                <li><Link href="#" className="text-sm hover:text-gray-300">Your Account</Link></li>
                <li><Link href="#" className="text-sm hover:text-gray-300">Your Orders</Link></li>
                <li><Link href="#" className="text-sm hover:text-gray-300">Shipping Rates & Policies</Link></li>
                <li><Link href="#" className="text-sm hover:text-gray-300">Returns & Replacements</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
