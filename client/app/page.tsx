import Link from "next/link";
import { GraduationCap, Users, BookOpen } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gray-900">ProjectHub</span>
          </div>
          <Link
            href="/auth/login"
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Streamline College Project Management
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            A comprehensive platform for students, faculty, and administrators to manage
            mini, minor, and major projects efficiently.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/auth/signup"
              className="px-8 py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-lg font-medium"
            >
              Get Started
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-3 border-2 border-primary text-primary rounded-md hover:bg-primary/5 transition-colors text-lg font-medium"
            >
              Login
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="p-6 border border-gray-200 rounded-lg">
              <Users className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team Formation</h3>
              <p className="text-gray-600">
                Create and join project groups with your peers seamlessly
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <BookOpen className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Mentor Allocation</h3>
              <p className="text-gray-600">
                Select mentors based on your preferences and expertise needs
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <GraduationCap className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
              <p className="text-gray-600">
                Tailored dashboards for students, faculty, and administrators
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

