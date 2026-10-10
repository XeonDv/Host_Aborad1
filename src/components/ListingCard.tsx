import { MapPin, Star, UtensilsCrossed, BedDouble, Wifi, Home as HomeIcon } from 'lucide-react';
import type { Listing } from '@/lib/types';
import { useRouter } from '@/lib/router';
import { formatCAD } from '@/lib/format';

interface ListingCardProps {
  listing: Listing;
  roomCount?: number;
}

export function ListingCard({ listing, roomCount }: ListingCardProps) {
  const { navigate } = useRouter();
  const photo = listing.photo_urls?.[0] ?? 'https://images.pexels.com/photos/6510421/pexels-photo-6510421.jpeg?auto=compress&cs=tinysrgb&h=600&w=800';

  return (
    <button
      onClick={() => navigate(`/listings/${listing.id}`)}
      className="group text-left rounded-2xl bg-white border border-sand-200 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-100">
        <img
          src={photo}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          {roomCount !== undefined && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/90 backdrop-blur text-sand-800 shadow-sm flex items-center gap-1">
              <HomeIcon className="w-3 h-3" /> {roomCount} {roomCount === 1 ? 'room' : 'rooms'}
            </span>
          )}
          {listing.meals_included && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-700/90 text-white shadow-sm flex items-center gap-1">
              <UtensilsCrossed className="w-3 h-3" /> Meals
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sand-900 text-sm leading-snug line-clamp-1">{listing.title}</h3>
          <span className="flex items-center gap-1 text-xs font-semibold text-sand-700 flex-shrink-0">
            <Star className="w-3.5 h-3.5 fill-brand-500 text-brand-500" /> 4.9
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-sand-500">
          <MapPin className="w-3.5 h-3.5" /> {listing.neighbourhood ? `${listing.neighbourhood}, ` : ''}{listing.city}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-sand-500">
          {roomCount !== undefined && (
            <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {roomCount} {roomCount === 1 ? 'room' : 'rooms'}</span>
          )}
          <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5" /> Wi-Fi</span>
        </div>
        <div className="mt-3 pt-3 border-t border-sand-100 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-sand-500">from</span>
            <span className="text-lg font-extrabold text-sand-900">{formatCAD(Number(listing.price_per_month))}</span>
          </div>
          <span className="text-xs text-sand-500">/ month</span>
        </div>
      </div>
    </button>
  );
}
