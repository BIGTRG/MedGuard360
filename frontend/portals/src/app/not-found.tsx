import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-200">404</h1>
        <p className="mt-4 text-xl text-slate-600">Page not found</p>
        <p className="mt-2 text-sm text-slate-500">
          The page you are looking for does not exist or you do not have permission to view it.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-brand-600 hover:underline text-sm font-medium"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
