import { AuthProvider } from '@/lib/auth';
import { RouterProvider, useRouter } from '@/lib/router';
import { Navbar, Footer } from '@/components/Chrome';
import { LandingPage } from '@/pages/Landing';
import { ListingsPage } from '@/pages/Listings';
import { ListingDetailPage } from '@/pages/ListingDetail';
import { ListingEditor } from '@/pages/ListingEditor';
import { DashboardPage } from '@/pages/Dashboard';
import { SignUpPage } from '@/pages/SignUp';
import { SignInPage } from '@/pages/SignIn';
import { RegistrationPage } from '@/pages/Registration';
import { AdminPage } from '@/pages/Admin';

function Routes() {
  const { path } = useRouter();
  const cleanPath = path.split('?')[0];

  let page: React.ReactNode;
  let showFooter = true;
  let showNavbar = true;

  if (cleanPath === '/' || cleanPath === '') {
    page = <LandingPage />;
  } else if (cleanPath === '/listings') {
    page = <ListingsPage />;
  } else if (cleanPath.startsWith('/listings/new')) {
    page = <ListingEditor />;
  } else if (cleanPath.startsWith('/listings/') && cleanPath.endsWith('/edit')) {
    const id = cleanPath.split('/')[2];
    page = <ListingEditor listingId={id} />;
  } else if (cleanPath.startsWith('/listings/')) {
    const id = cleanPath.split('/')[2];
    page = <ListingDetailPage id={id} />;
  } else if (cleanPath === '/dashboard') {
    page = <DashboardPage />;
  } else if (cleanPath === '/register') {
    page = <RegistrationPage />;
    showFooter = false;
  } else if (cleanPath === '/admin') {
    page = <AdminPage />;
    showFooter = false;
  } else if (cleanPath === '/signup') {
    page = <SignUpPage />;
    showFooter = false;
  } else if (cleanPath === '/signin') {
    page = <SignInPage />;
    showFooter = false;
  } else {
    page = <NotFound />;
    showFooter = false;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar />}
      <main className="flex-1">{page}</main>
      {showFooter && <Footer />}
    </div>
  );
}

function NotFound() {
  const { navigate } = useRouter();
  return (
    <div className="pt-16 min-h-screen flex flex-col items-center justify-center px-5 text-center">
      <p className="text-6xl font-extrabold text-brand-700">404</p>
      <h1 className="mt-3 text-xl font-bold text-sand-900">Page not found</h1>
      <p className="mt-2 text-sand-600">The page you're looking for doesn't exist or has moved.</p>
      <button
        onClick={() => navigate('/')}
        className="mt-6 px-5 py-2.5 text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 rounded-xl shadow-sm transition"
      >
        Back to home
      </button>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </RouterProvider>
  );
}
