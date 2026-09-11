import {
  Grid2x2, Ticket, Shirt, Box, Search, ShoppingCart, Menu, X, Sun, Moon,
  Plus, Minus, Trash2, CircleCheck, Truck, User, LogOut, ChevronRight, ChevronLeft,
  MapPin, Phone, Mail, Instagram, Scissors, Wallet, Star, ArrowLeft, RotateCcw,
  Package, TrendingUp, Volume2, VolumeX, ChevronDown, Check, Sparkles,
} from 'lucide-react';

const MAP = {
  grid: Grid2x2, ticket: Ticket, shirt: Shirt, box: Box, needle: Scissors,
  trending: TrendingUp, search: Search, cart: ShoppingCart, menu: Menu, x: X,
  sun: Sun, moon: Moon, plus: Plus, minus: Minus, trash: Trash2,
  circleCheck: CircleCheck, truck: Truck, user: User, logout: LogOut,
  chevronRight: ChevronRight, chevronLeft: ChevronLeft, pin: MapPin,
  phone: Phone, mail: Mail, instagram: Instagram, wallet: Wallet, star: Star,
  arrowLeft: ArrowLeft, refresh: RotateCcw, package: Package,
  volume: Volume2, volumeOff: VolumeX, chevronDown: ChevronDown, check: Check, spark: Sparkles,
};

export default function Icon({ name, size = 18, ...rest }) {
  const Cmp = MAP[name] || Grid2x2;
  return <Cmp size={size} strokeWidth={2} {...rest} />;
}
