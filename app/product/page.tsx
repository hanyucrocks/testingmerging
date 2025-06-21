"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart, Heart, Share2, Shield } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function ProductPage() {
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState(0)

  const product = {
    id: 1,
    name: "Premium Wireless Headphones",
    price: 129.99,
    originalPrice: 199.99,
    rating: 4.5,
    reviews: 1247,
    description: "Experience crystal-clear sound with our premium wireless headphones. Features active noise cancellation, 30-hour battery life, and comfortable over-ear design.",
    images: [
      "/headphones-1.jpg",
      "/headphones-2.jpg",
      "/headphones-3.jpg",
      "/headphones-4.jpg"
    ],
    features: [
      "Active Noise Cancellation",
      "30-hour Battery Life",
      "Bluetooth 5.0",
      "Built-in Microphone",
      "Foldable Design"
    ],
    stock: 15,
    delivery: "Free delivery by Tomorrow",
    warranty: "2 Year Warranty"
  }

  const handleBuyWithAmazonPay = () => {
    // Redirect to VaultX app
    router.push('/vaultx')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Amazon</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Cart
            </Button>
            <Button variant="ghost" size="sm">
              <Heart className="h-5 w-5 mr-2" />
              Wishlist
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-white p-4">
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-contain"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-orange-500' : 'border-gray-200'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${product.name} view ${index + 1}`}
                    fill
                    className="object-contain"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <div className="flex items-center space-x-2 mt-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {product.rating} ({product.reviews.toLocaleString()} ratings)
                </span>
              </div>
            </div>

            <div className="border-t border-b border-gray-200 py-4">
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-gray-900">
                  ${product.price}
                </span>
                <span className="text-lg text-gray-500 line-through">
                  ${product.originalPrice}
                </span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Save ${(product.originalPrice - product.price).toFixed(2)}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-2">{product.delivery}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900">About this item</h2>
              <ul className="mt-2 space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleBuyWithAmazonPay}
              >
                Buy with Amazon Pay
                <Shield className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" className="w-full">
                Add to Cart
              </Button>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                <span>{product.warranty}</span>
              </div>
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 