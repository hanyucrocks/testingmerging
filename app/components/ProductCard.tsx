import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface ProductCardProps {
  id: number
  name: string
  price: number
  originalPrice: number
  rating: number
  reviews: number
  image: string
}

export function ProductCard({
  id,
  name,
  price,
  originalPrice,
  rating,
  reviews,
  image,
}: ProductCardProps) {
  return (
    <Link href={`/product/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="relative aspect-square mb-4">
            <Image
              src={image}
              alt={name}
              fill
              className="object-contain"
            />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2">{name}</h3>
            <div className="flex items-center space-x-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                ({reviews.toLocaleString()})
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-bold text-gray-900">
                ${price}
              </span>
              <span className="text-sm text-gray-500 line-through">
                ${originalPrice}
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Save ${(originalPrice - price).toFixed(2)}
              </Badge>
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
} 