export type UserType = 'student' | 'host' | 'admin';

export interface Profile {
  id: string;
  user_type: UserType;
  full_name: string;
  phone: string;
  country: string;
  city: string;
  bio: string;
  avatar_url: string;
  registration_paid: boolean;
  registration_fee_paid_at: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  host_id: string;
  title: string;
  description: string;
  city: string;
  neighbourhood: string;
  price_per_month: number;
  room_type: 'Private room' | 'Shared room' | 'Studio';
  meals_included: boolean;
  amenities: string[];
  photo_urls: string[];
  available_from: string | null;
  available_to: string | null;
  max_stay_months: number;
  created_at: string;
}

export interface Room {
  id: string;
  listing_id: string;
  title: string;
  description: string;
  room_type: 'Private room' | 'Shared room' | 'Studio';
  beds: number;
  price_per_month: number;
  photo_urls: string[];
  available_from: string | null;
  available_to: string | null;
  max_stay_months: number;
  created_at: string;
}

export interface Booking {
  id: string;
  student_id: string;
  listing_id: string;
  room_id: string | null;
  check_in: string;
  check_out: string;
  months: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  stripe_session_id: string;
  created_at: string;
}

export interface ListingWithHost extends Listing {
  host: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'city' | 'country'> | null;
}

export interface ListingWithRooms extends Listing {
  rooms: Room[];
}

export interface BookingWithDetails extends Booking {
  listing: Pick<Listing, 'id' | 'title' | 'city' | 'price_per_month' | 'photo_urls'> | null;
  room: Pick<Room, 'id' | 'title' | 'room_type' | 'beds' | 'price_per_month'> | null;
  student: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'country'> | null;
}

export interface PublicHost extends Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'city' | 'country' | 'bio'> {}

export interface AdminProfile extends Profile {
  email: string;
}

export interface AdminListing extends Listing {
  host_name: string;
  host_email: string;
}

export interface AdminBooking extends Booking {
  listing_title: string;
  listing_city: string;
  student_name: string;
  student_email: string;
}

export interface ListingWithCount extends Listing {
  room_count: number;
}

export type BookingWithRelations = Booking & {
  listing: Listing | null;
  student?: PublicHost | null;
};
