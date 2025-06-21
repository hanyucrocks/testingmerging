"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Fingerprint,
  Wifi,
  WifiOff,
  Coins,
  Gift,
  Shield,
  Star,
  Mic,
  Globe,
  CreditCard,
  ChevronRight,
  Bell,
  Settings,
  User,
  Target,
  Award,
  Moon,
  Sun,
  CheckCircle2,
} from "lucide-react"
import { BiometricAuth } from "../components/BiometricAuth"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

interface PendingPayment {
  id: string
  amount: number
  merchant: string
  status: 'pending' | 'syncing'
}

type Language = 'en' | 'hi';

const translations: Record<Language, { [key: string]: string }> = {
  en: {
    payWithFingerprint: "Tap and authenticate with fingerprint or Face ID",
    pendingPayments: "Pending Payments",
    waitingToSync: "Waiting to sync",
    syncing: "Syncing...",
    smartCoinsAvailable: "SmartCoins Available",
    redeem: "Redeem",
    gift: "Gift",
    youEarned: "You earned SmartCoins!",
    forSafeShopping: "+50 SmartCoins for safe shopping",
    recentActivity: "Recent Activity",
    useSmartCoinsOn: "Use SmartCoins On",
    comingSoon: "Coming Soon",
    trustMissions: "Trust Missions",
    completeMissions: "Complete missions to earn bonus SmartCoins",
    reward: "Reward",
    completed: "Completed",
    active: "Active",
    progress: "Progress",
    safeShoppingScore: "Safe Shopping Score",
    voice: "Voice",
    amazonPay: "Amazon Pay",
    poweredByVaultX: "Powered by VaultX",
    onlineSyncing: "Online – Syncing",
    offlineLocked: "Offline – Payment Locked",
    allSystemsOperational: "All systems operational",
    paymentsWillSync: "Payments will sync when online",
  },
  hi: {
    payWithFingerprint: "फिंगरप्रिंट या फेस आईडी से प्रमाणित करें",
    pendingPayments: "लंबित भुगतान",
    waitingToSync: "सिंक की प्रतीक्षा",
    syncing: "सिंक हो रहा है...",
    smartCoinsAvailable: "स्मार्टकॉइन्स उपलब्ध",
    redeem: "भुनाएं",
    gift: "उपहार दें",
    youEarned: "आपने स्मार्टकॉइन्स अर्जित किए!",
    forSafeShopping: "सुरक्षित खरीदारी के लिए +50 स्मार्टकॉइन्स",
    recentActivity: "हाल की गतिविधि",
    useSmartCoinsOn: "इन पर स्मार्टकॉइन्स का उपयोग करें",
    comingSoon: "जल्द आ रहा है",
    trustMissions: "ट्रस्ट मिशन",
    completeMissions: "अतिरिक्त स्मार्टकॉइन्स अर्जित करने के लिए मिशन पूरा करें",
    reward: "इनाम",
    completed: "पूरा हुआ",
    active: "सक्रिय",
    progress: "प्रगति",
    safeShoppingScore: "सुरक्षित खरीदारी स्कोर",
    voice: "आवाज़",
    amazonPay: "अमेज़न पे",
    poweredByVaultX: "VaultX द्वारा संचालित",
    onlineSyncing: "ऑनलाइन – सिंक हो रहा है",
    offlineLocked: "ऑफलाइन – भुगतान लॉक्ड",
    allSystemsOperational: "सभी सिस्टम चालू हैं",
    paymentsWillSync: "ऑनलाइन होने पर भुगतान सिंक हो जाएगा",
  }
};

// Define type for a rating object
interface SellerRating {
  saleId: string;
  date: string;
  rating: number;
  customerName: string;
  review: string;
}

// Replace ratings array with a more realistic fake dataset for each seller
const sellers = [
  {
    sellerId: "SELLER123",
    name: "Best Electronics",
    totalSales: 25,
    ratings: [
      { saleId: "SALE1", date: "2024-06-01", rating: 5, customerName: "Amit Kumar", review: "Great product and fast delivery!" },
      { saleId: "SALE2", date: "2024-05-31", rating: 4, customerName: "Priya Singh", review: "Good service, will buy again." },
      { saleId: "SALE3", date: "2024-05-30", rating: 5, customerName: "Rahul Verma", review: "Excellent quality." },
      { saleId: "SALE4", date: "2024-05-29", rating: 5, customerName: "Sneha Patel", review: "Very satisfied!" },
      { saleId: "SALE5", date: "2024-05-28", rating: 4, customerName: "Vikas Sharma", review: "Product as described." },
      { saleId: "SALE6", date: "2024-05-27", rating: 5, customerName: "Neha Gupta", review: "Superb experience." },
      { saleId: "SALE7", date: "2024-05-26", rating: 5, customerName: "Rohit Jain", review: "Highly recommend." },
      { saleId: "SALE8", date: "2024-05-25", rating: 4, customerName: "Kiran Rao", review: "Good, but packaging could improve." },
      { saleId: "SALE9", date: "2024-05-24", rating: 5, customerName: "Deepak Mehta", review: "Perfect!" },
      { saleId: "SALE10", date: "2024-05-23", rating: 5, customerName: "Anjali Desai", review: "Loved it." },
      { saleId: "SALE11", date: "2024-05-22", rating: 3, customerName: "Suresh Yadav", review: "Average experience." },
      { saleId: "SALE12", date: "2024-05-21", rating: 5, customerName: "Meena Joshi", review: "Very happy!" },
      { saleId: "SALE13", date: "2024-05-20", rating: 4, customerName: "Arjun Kapoor", review: "Good value for money." },
      { saleId: "SALE14", date: "2024-05-19", rating: 5, customerName: "Divya Nair", review: "Excellent!" },
      { saleId: "SALE15", date: "2024-05-18", rating: 5, customerName: "Manish Agarwal", review: "Quick delivery." },
      { saleId: "SALE16", date: "2024-05-17", rating: 5, customerName: "Pooja Sethi", review: "Very good." },
      { saleId: "SALE17", date: "2024-05-16", rating: 4, customerName: "Sanjay Bansal", review: "Nice product." },
      { saleId: "SALE18", date: "2024-05-15", rating: 5, customerName: "Ritu Malhotra", review: "Awesome!" },
      { saleId: "SALE19", date: "2024-05-14", rating: 5, customerName: "Nitin Saxena", review: "Very pleased." },
      { saleId: "SALE20", date: "2024-05-13", rating: 5, customerName: "Kavita Rao", review: "Great experience." },
      { saleId: "SALE21", date: "2024-05-12", rating: 2, customerName: "Ajay Singh", review: "Not as expected." },
      { saleId: "SALE22", date: "2024-05-11", rating: 5, customerName: "Sunita Sharma", review: "Perfect condition." },
      { saleId: "SALE23", date: "2024-05-10", rating: 5, customerName: "Rakesh Kumar", review: "Very good service." },
      { saleId: "SALE24", date: "2024-05-09", rating: 4, customerName: "Geeta Menon", review: "Good overall." },
      { saleId: "SALE25", date: "2024-05-08", rating: 5, customerName: "Tarun Mishra", review: "Excellent!" }
    ]
  },
  {
    sellerId: "SELLER456",
    name: "Gadget World",
    totalSales: 20,
    ratings: [
      { saleId: "SALE1", date: "2024-06-01", rating: 4, customerName: "Ravi Kumar", review: "Good product." },
      { saleId: "SALE2", date: "2024-05-31", rating: 4, customerName: "Shalini Singh", review: "Nice, but delivery was late." },
      { saleId: "SALE3", date: "2024-05-30", rating: 3, customerName: "Vivek Mehra", review: "Average quality." },
      { saleId: "SALE4", date: "2024-05-29", rating: 5, customerName: "Asha Patel", review: "Loved it!" },
      { saleId: "SALE5", date: "2024-05-28", rating: 4, customerName: "Karan Sethi", review: "Good value." },
      { saleId: "SALE6", date: "2024-05-27", rating: 4, customerName: "Nisha Jain", review: "Nice experience." },
      { saleId: "SALE7", date: "2024-05-26", rating: 3, customerName: "Siddharth Rao", review: "Could be better." },
      { saleId: "SALE8", date: "2024-05-25", rating: 4, customerName: "Mehul Shah", review: "Good." },
      { saleId: "SALE9", date: "2024-05-24", rating: 4, customerName: "Ritika Desai", review: "Nice product." },
      { saleId: "SALE10", date: "2024-05-23", rating: 5, customerName: "Ankit Gupta", review: "Excellent!" },
      { saleId: "SALE11", date: "2024-05-22", rating: 2, customerName: "Pankaj Yadav", review: "Not satisfied." },
      { saleId: "SALE12", date: "2024-05-21", rating: 3, customerName: "Kavya Nair", review: "Okay experience." },
      { saleId: "SALE13", date: "2024-05-20", rating: 4, customerName: "Rohini Agarwal", review: "Good." },
      { saleId: "SALE14", date: "2024-05-19", rating: 4, customerName: "Saurabh Joshi", review: "Nice." },
      { saleId: "SALE15", date: "2024-05-18", rating: 3, customerName: "Ramesh Kumar", review: "Average." },
      { saleId: "SALE16", date: "2024-05-17", rating: 4, customerName: "Neeraj Sharma", review: "Good." },
      { saleId: "SALE17", date: "2024-05-16", rating: 4, customerName: "Aarti Mehta", review: "Nice product." },
      { saleId: "SALE18", date: "2024-05-15", rating: 5, customerName: "Sonal Kapoor", review: "Excellent!" },
      { saleId: "SALE19", date: "2024-05-14", rating: 3, customerName: "Gaurav Singh", review: "Average." },
      { saleId: "SALE20", date: "2024-05-13", rating: 4, customerName: "Ruchi Jain", review: "Good." }
    ]
  },
  {
    sellerId: "SELLER789",
    name: "Home Essentials",
    totalSales: 20,
    ratings: [
      { saleId: "SALE1", date: "2024-06-01", rating: 5, customerName: "Harshita Sharma", review: "Amazing!" },
      { saleId: "SALE2", date: "2024-05-31", rating: 5, customerName: "Aman Verma", review: "Very good quality." },
      { saleId: "SALE3", date: "2024-05-30", rating: 4, customerName: "Nidhi Patel", review: "Good." },
      { saleId: "SALE4", date: "2024-05-29", rating: 4, customerName: "Sahil Gupta", review: "Nice product." },
      { saleId: "SALE5", date: "2024-05-28", rating: 5, customerName: "Ritika Sinha", review: "Loved it!" },
      { saleId: "SALE6", date: "2024-05-27", rating: 5, customerName: "Kushal Mehra", review: "Excellent!" },
      { saleId: "SALE7", date: "2024-05-26", rating: 4, customerName: "Simran Kaur", review: "Good experience." },
      { saleId: "SALE8", date: "2024-05-25", rating: 5, customerName: "Vivek Sharma", review: "Very happy." },
      { saleId: "SALE9", date: "2024-05-24", rating: 5, customerName: "Ananya Singh", review: "Perfect!" },
      { saleId: "SALE10", date: "2024-05-23", rating: 5, customerName: "Rohit Agarwal", review: "Great service." },
      { saleId: "SALE11", date: "2024-05-22", rating: 5, customerName: "Megha Jain", review: "Superb!" },
      { saleId: "SALE12", date: "2024-05-21", rating: 5, customerName: "Sandeep Kumar", review: "Very good." },
      { saleId: "SALE13", date: "2024-05-20", rating: 4, customerName: "Priyanka Yadav", review: "Good." },
      { saleId: "SALE14", date: "2024-05-19", rating: 5, customerName: "Deepa Joshi", review: "Excellent!" },
      { saleId: "SALE15", date: "2024-05-18", rating: 5, customerName: "Aakash Singh", review: "Very happy." },
      { saleId: "SALE16", date: "2024-05-17", rating: 5, customerName: "Kriti Sharma", review: "Great!" },
      { saleId: "SALE17", date: "2024-05-16", rating: 5, customerName: "Naman Gupta", review: "Perfect." },
      { saleId: "SALE18", date: "2024-05-15", rating: 5, customerName: "Shreya Mehta", review: "Awesome!" },
      { saleId: "SALE19", date: "2024-05-14", rating: 4, customerName: "Rajat Kapoor", review: "Good." },
      { saleId: "SALE20", date: "2024-05-13", rating: 5, customerName: "Tanvi Sethi", review: "Excellent!" }
    ]
  }
];

function calculateSafeShoppingScore(seller: typeof sellers[0]) {
  const avgRating = seller.ratings.reduce((a, b) => a + b.rating, 0) / seller.ratings.length;
  const salesScore = Math.min(seller.totalSales, 100) / 100; // cap at 100 sales
  return Math.round((avgRating / 5) * 70 + salesScore * 30);
}

function getRatingsDistribution(ratings: { rating: number }[]) {
  // Returns array of {star: number, count: number}
  const dist = [1,2,3,4,5].map(star => ({ star, count: ratings.filter(r => r.rating === star).length }));
  return dist;
}

function getSalesHistory(sellerId: string) {
  const seller = sellers.find(s => s.sellerId === sellerId);
  if (!seller) return [];
  return seller.ratings;
}

// AI-powered sentiment analysis (simple rule-based for demo)
function getSentiment(review: string) {
  const positiveWords = ["great", "good", "excellent", "superb", "perfect", "happy", "recommend", "loved", "awesome", "amazing", "satisfied", "very pleased", "quick", "nice", "value", "best", "fast", "superb", "very good", "great experience", "highly recommend"];
  const negativeWords = ["not", "average", "could", "late", "bad", "poor", "disappointed", "problem", "issue", "slow", "worse", "unsatisfied", "not as expected"];
  const reviewLower = review.toLowerCase();
  let score = 0;
  positiveWords.forEach(word => { if (reviewLower.includes(word)) score++; });
  negativeWords.forEach(word => { if (reviewLower.includes(word)) score--; });
  if (score > 0) return { label: "Positive", emoji: "😊", color: "text-green-600" };
  if (score < 0) return { label: "Negative", emoji: "😞", color: "text-red-600" };
  return { label: "Neutral", emoji: "😐", color: "text-yellow-600" };
}

// AI-powered review summary (rule-based)
function getReviewSummary(ratings: SellerRating[]) {
  let pos = 0, neu = 0, neg = 0;
  const posWords: Record<string, number> = {}, negWords: Record<string, number> = {};
  ratings.forEach((r: SellerRating) => {
    const sentiment = getSentiment(r.review);
    if (sentiment.label === "Positive") pos++;
    else if (sentiment.label === "Negative") neg++;
    else neu++;
    // Count words
    r.review.toLowerCase().split(/\W+/).forEach((word: string) => {
      if (["great", "good", "excellent", "superb", "perfect", "happy", "recommend", "loved", "awesome", "amazing", "satisfied", "pleased", "quick", "nice", "value", "best", "fast", "very", "experience", "highly"].includes(word)) {
        posWords[word] = (posWords[word] || 0) + 1;
      }
      if (["not", "average", "could", "late", "bad", "poor", "disappointed", "problem", "issue", "slow", "worse", "unsatisfied", "expected"].includes(word)) {
        negWords[word] = (negWords[word] || 0) + 1;
      }
    });
  });
  // Get most common words
  const topPosEntry = Object.entries(posWords).sort((a, b) => b[1] - a[1])[0];
  const topNegEntry = Object.entries(negWords).sort((a, b) => b[1] - a[1])[0];
  const topPos = topPosEntry ? topPosEntry[0] : null;
  const topNeg = topNegEntry ? topNegEntry[0] : null;
  return {
    pos, neu, neg,
    topPos,
    topNeg
  };
}

// AI-powered anomaly detection
function hasNegativeTrend(ratings: SellerRating[]) {
  const last5 = ratings.slice(0, 5); // most recent 5
  let negCount = 0;
  last5.forEach((r: SellerRating) => {
    const sentiment = getSentiment(r.review);
    if (sentiment.label === "Negative") negCount++;
  });
  return negCount > 2;
}

// AI-powered trust score explanation
function getTrustScoreExplanation(seller: { ratings: SellerRating[]; totalSales: number }) {
  const avgRating = seller.ratings.reduce((a, b) => a + b.rating, 0) / seller.ratings.length;
  if (avgRating > 4.5 && seller.totalSales > 15) {
    return "Score is high due to consistently positive reviews and high sales volume.";
  } else if (avgRating < 3.5) {
    return "Score is low due to several negative or average reviews.";
  } else if (seller.totalSales < 10) {
    return "Score is moderate; seller has limited sales history.";
  } else if (hasNegativeTrend(seller.ratings)) {
    return "Score is affected by recent negative reviews.";
  } else {
    return "Score reflects a balance of positive and neutral feedback.";
  }
}

export default function VaultXApp() {
  const [activeTab, setActiveTab] = useState("snappay")
  const [isOnline, setIsOnline] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [language, setLanguage] = useState<Language>("en")
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [selectedSellerId, setSelectedSellerId] = useState("")
  const [showAIInsights, setShowAIInsights] = useState(true)
  const searchParams = useSearchParams()
  const amount = searchParams.get('amount')
  const product = searchParams.get('product')

  const smartCoinsBalance = 1247
  
  // Calculate dynamic Safe Shopping Score based on selected seller
  const selectedSeller = sellers.find(s => s.sellerId === selectedSellerId)
  const safeShoppingScore = selectedSeller ? calculateSafeShoppingScore(selectedSeller) : 85

  const recentTransactions = [
    { id: 1, type: "earned", description: "Price drop refund", amount: "+50", time: "2 hours ago" },
    { id: 2, type: "earned", description: "Safe purchase bonus", amount: "+25", time: "1 day ago" },
    { id: 3, type: "redeemed", description: "Amazon purchase", amount: "-100", time: "2 days ago" },
    { id: 4, type: "earned", description: "Trust mission completed", amount: "+75", time: "3 days ago" },
  ]

  const trustMissions = [
    { id: 1, title: "Shop from VaultX Preferred Sellers", progress: 60, reward: 100, completed: false },
    { id: 2, title: "Complete 5 safe purchases", progress: 80, reward: 150, completed: false },
    { id: 3, title: "Refer a friend to VaultX", progress: 0, reward: 200, completed: false },
  ]

  const partnerPlatforms = [
    { name: "Zomato", icon: "🍕", available: true },
    { name: "Uber", icon: "🚗", available: true },
    { name: "MakeMyTrip", icon: "✈️", available: true },
    { name: "BookMyShow", icon: "🎬", available: false },
  ]

  useEffect(() => {
    // Check network status
    const checkNetworkStatus = () => {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', checkNetworkStatus)
    window.addEventListener('offline', checkNetworkStatus)

    return () => {
      window.removeEventListener('online', checkNetworkStatus)
      window.removeEventListener('offline', checkNetworkStatus)
    }
  }, [])

  const handleTransactionSuccess = (transaction: { id: string }) => {
    if (!isOnline) {
      setPendingPayments(prev => [...prev, {
        id: transaction.id,
        amount: amount ? parseFloat(amount) : 0,
        merchant: product || 'Amazon',
        status: 'pending'
      }])
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark bg-gray-900" : "bg-gray-50"}`}>
      {/* Amazon Pay Header */}
      <div className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className={`font-bold text-lg ${isDarkMode ? "text-white" : "text-gray-900"}`}>{translations[language].amazonPay}</h1>
              <p className="text-xs text-orange-500 font-medium">{translations[language].poweredByVaultX}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={isDarkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Language & Accessibility Bar */}
      <div
        className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-blue-50 border-blue-200"} border-b px-4 py-2`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className={`text-sm border-none bg-transparent ${isDarkMode ? "text-gray-300" : "text-blue-700"} font-medium`}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              <Mic className="h-4 w-4 mr-1" />
              {translations[language].voice}
            </Button>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {translations[language].safeShoppingScore}: {safeShoppingScore}%
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pb-20">
        {activeTab === "snappay" && (
          <div className="p-4 space-y-6">
            {/* Online/Offline Status */}
            {/* <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isOnline ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {isOnline ? "Online – Syncing" : "Offline – Payment Locked"}
                      </p>
                      <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {isOnline ? "All systems operational" : "Payments will sync when online"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={isOnline} onCheckedChange={setIsOnline} />
                </div>
              </CardContent>
            </Card> */}

            {/* Pay Now Button */}
            <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <BiometricAuth
                      onSuccess={handleTransactionSuccess}
                      onError={(error) => console.error(error)}
                      onTabChange={handleTabChange}
                      amount={amount ? parseFloat(amount) : undefined}
                    />
                    <div className="absolute -top-2 -right-2 bg-blue-600 rounded-full p-2">
                      <Fingerprint className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {translations[language].payWithFingerprint}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pending Payments Queue */}
            {!isOnline && pendingPayments.length > 0 && (
              <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
                <CardHeader>
                  <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {translations[language].pendingPayments} ({pendingPayments.length})
                  </h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            payment.status === "pending" ? "bg-yellow-500" : "bg-blue-500"
                          }`}
                        />
                        <div>
                          <p className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {payment.merchant}
                          </p>
                          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {payment.status === "pending" ? translations[language].waitingToSync : translations[language].syncing}
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        ${payment.amount}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "smartcoins" && (
          <div className="p-4 space-y-6">
            {/* SmartCoins Balance */}
            <Card
              className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gradient-to-br from-orange-50 to-yellow-50"} border-2 border-orange-200`}
            >
              <CardContent className="p-6 text-center">
                <div className="space-y-4">
                  <div className="relative">
                    <Coins className="h-16 w-16 text-orange-500 mx-auto" />
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">+</span>
                    </div>
                  </div>
                  <div>
                    <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {smartCoinsBalance.toLocaleString()}
                    </h2>
                    <p className="text-orange-600 font-medium">{translations[language].smartCoinsAvailable}</p>
                  </div>
                  <div className="flex space-x-3">
                    <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                      <Gift className="h-4 w-4 mr-2" />
                      {translations[language].redeem}
                    </Button>
                    <Button variant="outline" className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50">
                      <User className="h-4 w-4 mr-2" />
                      {translations[language].gift}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New Rewards Notification */}
            <Card
              className={`${isDarkMode ? "bg-green-900 border-green-700" : "bg-green-50"} border-2 border-green-200`}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 rounded-full p-2">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className={`font-medium ${isDarkMode ? "text-green-100" : "text-green-800"}`}>
                      {translations[language].youEarned}
                    </p>
                    <p className={`text-sm ${isDarkMode ? "text-green-200" : "text-green-600"}`}>
                      {translations[language].forSafeShopping}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
              <CardHeader>
                <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{translations[language].recentActivity}</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === "earned"
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-red-100 dark:bg-red-900"
                        }`}
                      >
                        {transaction.type === "earned" ? (
                          <Coins className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {transaction.description}
                        </p>
                        <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {transaction.time}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold ${
                        transaction.type === "earned"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {transaction.amount} SC
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Partner Platforms */}
            <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
              <CardHeader>
                <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{translations[language].useSmartCoinsOn}</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {partnerPlatforms.map((platform) => (
                    <div
                      key={platform.name}
                      className={`p-4 rounded-lg border-2 text-center ${
                        platform.available
                          ? `${isDarkMode ? "border-gray-600 hover:border-orange-500" : "border-gray-200 hover:border-orange-300"} cursor-pointer hover:shadow-md transition-all`
                          : `${isDarkMode ? "border-gray-700 bg-gray-700" : "border-gray-100 bg-gray-50"} opacity-50`
                      }`}
                    >
                      <div className="text-2xl mb-2">{platform.icon}</div>
                      <p className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{platform.name}</p>
                      {!platform.available && (
                        <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{translations[language].comingSoon}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "missions" && (
          <div className="p-4 space-y-6">
            {/* Trust Missions Header */}
            <Card className={`${isDarkMode ? "bg-blue-900 border-blue-700" : "bg-blue-50"} border-2 border-blue-200`}>
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h2 className={`text-xl font-bold ${isDarkMode ? "text-blue-100" : "text-blue-900"}`}>
                  {translations[language].trustMissions}
                </h2>
                <p className={`${isDarkMode ? "text-blue-200" : "text-blue-700"}`}>
                  {translations[language].completeMissions}
                </p>
              </CardContent>
            </Card>

            {/* Active Missions */}
            <div className="space-y-4">
              {trustMissions.map((mission) => (
                <Card key={mission.id} className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {mission.title}
                          </h3>
                          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                            {translations[language].reward}: {mission.reward} SmartCoins
                          </p>
                        </div>
                        <Badge variant={mission.completed ? "default" : "secondary"}>
                          {mission.completed ? translations[language].completed : translations[language].active}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>{translations[language].progress}</span>
                          <span className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {mission.progress}%
                          </span>
                        </div>
                        <Progress value={mission.progress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Safe Shopping Progress */}
            <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
              <CardHeader>
                <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Safe Shopping Habits</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Award className="h-8 w-8 text-green-500" />
                    <div>
                      <p className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        3 safe purchases this month!
                      </p>
                      <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Keep up the great work
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">+25 SC</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">3</div>
                    <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Safe Purchases</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">85%</div>
                    <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Trust Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">1.2K</div>
                    <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>SC Earned</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "trust" && (
          <div className="p-4 space-y-6">
            <Card className={isDarkMode ? "bg-blue-900 border-blue-700" : "bg-blue-50 border-blue-200"}>
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h2 className={`text-xl font-bold ${isDarkMode ? "text-blue-100" : "text-blue-900"}`}>Seller Trust Checker</h2>
                <p className={`${isDarkMode ? "text-blue-200" : "text-blue-700"}`}>Select a seller to view their Safe Shopping Score based on previous sales and user ratings.</p>
                <div className="mt-4">
                  <select
                    value={selectedSellerId}
                    onChange={e => setSelectedSellerId(e.target.value)}
                    className="p-2 rounded border border-gray-300"
                  >
                    <option value="">Select Seller</option>
                    {sellers.map(seller => (
                      <option key={seller.sellerId} value={seller.sellerId}>{seller.name}</option>
                    ))}
                  </select>
                </div>
                {selectedSeller && (
                  <div className="mt-6 mx-auto w-full max-w-4xl">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Left: Seller details, AI insights, table */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-2">{selectedSeller.name}</h3>
                        <p>Average Rating: {(selectedSeller.ratings.reduce((a, b) => a + b.rating, 0) / selectedSeller.ratings.length).toFixed(2)} ⭐</p>
                        <p>Total Sales: {selectedSeller.totalSales}</p>
                        <p className="mt-2 font-bold">Safe Shopping Score: {safeShoppingScore}%</p>
                        <Progress value={safeShoppingScore} className="h-3 mt-2" />
                        <div className="mt-4">
                          <h4 className="font-semibold mb-1">How is the score calculated?</h4>
                          <ul className="list-disc ml-6 text-sm">
                            <li>Average Rating = Sum of all ratings / Number of ratings</li>
                            <li>Safe Shopping Score (%) = (Average Rating / 5) × 70 + (min(Total Sales, 100) / 100) × 30</li>
                            <li>More sales and higher ratings increase the score</li>
                          </ul>
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                          <button
                            className="px-3 py-1 rounded bg-blue-100 text-blue-800 text-xs font-semibold hover:bg-blue-200 transition"
                            onClick={() => setShowAIInsights(v => !v)}
                          >
                            {showAIInsights ? "Hide AI Insights" : "Show AI Insights"}
                          </button>
                          {showAIInsights && hasNegativeTrend(selectedSeller.ratings) && (
                            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-semibold">
                              ⚠️ Recent negative trend detected
                            </span>
                          )}
                        </div>
                        {showAIInsights && (
                          <>
                            <div className="mt-4">
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-semibold mb-1">Powered by AI</span>
                              <h4 className="font-semibold mb-1 mt-2">AI Review Summary</h4>
                              {(() => {
                                const summary = getReviewSummary(selectedSeller.ratings);
                                return (
                                  <div className="text-sm">
                                    <div>
                                      <span className="text-green-600 font-semibold">{summary.pos} Positive</span>,
                                      <span className="text-yellow-600 font-semibold ml-2">{summary.neu} Neutral</span>,
                                      <span className="text-red-600 font-semibold ml-2">{summary.neg} Negative</span>
                                    </div>
                                    <div className="mt-1">
                                      {summary.topPos && <span className="mr-4">Most common positive word: <span className="font-semibold text-green-700">{summary.topPos}</span></span>}
                                      {summary.topNeg && <span>Most common negative word: <span className="font-semibold text-red-700">{summary.topNeg}</span></span>}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="mt-2">
                              <h4 className="font-semibold mb-1">AI Trust Score Explanation</h4>
                              <div className="text-sm text-blue-900 bg-blue-50 rounded px-2 py-1 border border-blue-100">
                                {getTrustScoreExplanation(selectedSeller)}
                              </div>
                            </div>
                          </>
                        )}
                        <div className="mt-8">
                          {showAIInsights && (
                            <div className="mb-2 flex items-center gap-2">
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-semibold">Powered by AI</span>
                              <span className="text-xs text-gray-500">(Review Sentiment Analysis)</span>
                            </div>
                          )}
                          <h4 className="font-semibold mb-2">Previous Sellings & Customer Ratings</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border border-gray-200">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-1 border">Sale ID</th>
                                  <th className="px-2 py-1 border">Date</th>
                                  <th className="px-2 py-1 border">Customer</th>
                                  <th className="px-2 py-1 border">Rating</th>
                                  <th className="px-2 py-1 border">Review</th>
                                  <th className="px-2 py-1 border">Sentiment (AI)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getSalesHistory(selectedSeller.sellerId).map(sale => {
                                  const sentiment = getSentiment(sale.review);
                                  return (
                                    <tr key={sale.saleId}>
                                      <td className="px-2 py-1 border text-center">{sale.saleId}</td>
                                      <td className="px-2 py-1 border text-center">{sale.date}</td>
                                      <td className="px-2 py-1 border text-center">{sale.customerName}</td>
                                      <td className="px-2 py-1 border text-center">{sale.rating} ★</td>
                                      <td className="px-2 py-1 border text-center">{sale.review}</td>
                                      <td className={`px-2 py-1 border text-center font-semibold ${sentiment.color}`}>{sentiment.emoji} {sentiment.label}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      {/* Right: Ratings Distribution Graph */}
                      <div className="w-full md:w-96 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
                          <h4 className="font-semibold mb-2">Ratings Distribution</h4>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={getRatingsDistribution(selectedSeller.ratings)} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="star" tickFormatter={s => `${s}★`} />
                              <YAxis allowDecimals={false} />
                              <Tooltip formatter={(value) => [`${value} ratings`, 'Count']} />
                              <Bar dataKey="count" fill="#f59e42" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div
        className={`fixed bottom-0 left-0 right-0 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-t`}
      >
        <div className="flex items-center justify-around py-2">
          {[
            { id: "snappay", icon: CreditCard, label: "SnapPay" },
            { id: "smartcoins", icon: Coins, label: "SmartCoins" },
            { id: "missions", icon: Target, label: "Missions" },
            { id: "trust", icon: Shield, label: "Trust" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "text-orange-600 bg-orange-50 dark:bg-orange-900/20"
                  : `${isDarkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-900"}`
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amazon Pay Footer */}
      <div
        className={`fixed bottom-16 left-0 right-0 ${isDarkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"} border-t px-4 py-2`}
      >
        <div className="flex items-center justify-center space-x-2 text-xs">
          <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Powered by</span>
          <span className="font-bold text-orange-500">Amazon Pay</span>
          <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>•</span>
          <span className="font-bold text-blue-600">VaultX</span>
        </div>
      </div>
    </div>
  )
} 