import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import Header from './Header';

export default function Layout(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
