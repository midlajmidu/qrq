import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="text-center max-w-md">
                <p className="text-8xl font-black text-gray-200 mb-4">404</p>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
                <p className="text-gray-500 mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="inline-block px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Go Home
                </Link>
            </div>
        </div>
    );
}
