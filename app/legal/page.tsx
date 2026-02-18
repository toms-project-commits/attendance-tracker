'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Shield } from 'lucide-react';
import { clsx } from 'clsx';

type TabType = 'privacy' | 'terms';

export default function LegalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('privacy');

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--background)' }}>
      {/* TOP NAVIGATION */}
      <nav className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white px-4 md:px-6 py-4 flex justify-center items-center sticky top-0 z-50 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <h1 className="text-xl md:text-2xl font-black text-black dark:text-white flex items-center gap-2">
          <Shield size={24} /> Legal Hub
        </h1>
      </nav>

      <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-3 font-bold text-base",
            "border-[3px] border-black bg-white text-black",
            "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
            "transition-all duration-150",
            "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
            "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
            "dark:bg-slate-800 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
          )}
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Tabbed Interface */}
        <div className="border-[3px] border-black bg-white dark:bg-slate-800 dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
          {/* Tab Headers */}
          <div className="flex border-b-[3px] border-black dark:border-white">
            <button
              onClick={() => setActiveTab('privacy')}
              className={clsx(
                "flex-1 py-4 px-6 font-black text-base md:text-lg transition-all duration-150",
                "border-r-[3px] border-black dark:border-white",
                activeTab === 'privacy'
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Shield size={20} />
                <span className="hidden sm:inline">Privacy Policy</span>
                <span className="sm:hidden">Privacy</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={clsx(
                "flex-1 py-4 px-6 font-black text-base md:text-lg transition-all duration-150",
                activeTab === 'terms'
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText size={20} />
                <span className="hidden sm:inline">Terms & Conditions</span>
                <span className="sm:hidden">Terms</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 md:p-8 space-y-6">
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                {/* Privacy Policy Header */}
                <div className="border-[3px] border-black bg-blue-400 p-6 dark:border-white">
                  <h2 className="text-3xl md:text-4xl font-black text-black mb-3 flex items-center gap-3">
                    <Shield size={32} />
                    Privacy Policy
                  </h2>
                  <p className="text-base font-bold text-black">
                    Last Updated: February 8, 2026
                  </p>
                </div>

                {/* Introduction */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Introduction
                  </h3>
                  <p className="text-base font-semibold text-black dark:text-white leading-relaxed">
                    Welcome to BunkSafe! We take your privacy seriously. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our attendance tracking application.
                  </p>
                </section>

                {/* Information We Collect */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Information We Collect
                  </h3>
                  <div className="space-y-4">
                    <div className="border-[3px] border-black bg-yellow-100 dark:bg-yellow-900/30 dark:border-white p-4">
                      <h4 className="text-xl font-black text-black dark:text-yellow-300 mb-2">
                        1. Authentication Information
                      </h4>
                      <p className="text-base font-semibold text-black dark:text-white">
                        We collect your <strong>email address</strong> for authentication purposes. This is used to create your account and allow you to log in securely.
                      </p>
                    </div>

                    <div className="border-[3px] border-black bg-green-100 dark:bg-green-900/30 dark:border-white p-4">
                      <h4 className="text-xl font-black text-black dark:text-green-300 mb-2">
                        2. GPS Location Data
                      </h4>
                      <p className="text-base font-semibold text-black dark:text-white">
                        When you use the <strong>GPS Watermark feature</strong> for attendance proofs, we collect your GPS coordinates. This data is used <strong>strictly and exclusively</strong> for creating location-stamped proof images. We do not track your location at any other time.
                      </p>
                    </div>

                    <div className="border-[3px] border-black bg-purple-100 dark:bg-purple-900/30 dark:border-white p-4">
                      <h4 className="text-xl font-black text-black dark:text-purple-300 mb-2">
                        3. Camera Access
                      </h4>
                      <p className="text-base font-semibold text-black dark:text-white">
                        We request camera access to capture attendance proof photos with GPS watermarks. Camera access is used <strong>only when you explicitly capture a proof</strong> and is never used in the background.
                      </p>
                    </div>

                    <div className="border-[3px] border-black bg-blue-100 dark:bg-blue-900/30 dark:border-white p-4">
                      <h4 className="text-xl font-black text-black dark:text-blue-300 mb-2">
                        4. Attendance Data
                      </h4>
                      <p className="text-base font-semibold text-black dark:text-white">
                        We store your subjects, timetable, attendance logs, and semester information. This data is used solely to provide attendance tracking functionality.
                      </p>
                    </div>
                  </div>
                </section>

                {/* How We Use Your Data */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    How We Use Your Data
                  </h3>
                  <ul className="space-y-3 text-base font-semibold text-black dark:text-white">
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 text-xl">✓</span>
                      <span><strong>Authentication:</strong> Your email is used to securely authenticate your account.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 text-xl">✓</span>
                      <span><strong>Attendance Tracking:</strong> All attendance data is used to calculate your attendance percentage and provide insights.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 text-xl">✓</span>
                      <span><strong>GPS Watermarks:</strong> Location data is embedded into proof photos and stored with your attendance records for verification purposes only.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 text-xl">✗</span>
                      <span><strong>We DO NOT:</strong> Share, sell, or use your data for advertising, marketing, or any purpose beyond the core functionality of the app.</span>
                    </li>
                  </ul>
                </section>

                {/* Data Storage */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Data Storage & Security
                  </h3>
                  <div className="border-[3px] border-black bg-orange-100 dark:bg-orange-900/30 dark:border-white p-4">
                    <p className="text-base font-semibold text-black dark:text-white leading-relaxed">
                      All your data is securely stored in <strong>Supabase</strong>, a secure and reliable cloud database platform. We implement industry-standard security measures including:
                    </p>
                    <ul className="mt-3 space-y-2 text-base font-semibold text-black dark:text-white">
                      <li>• Row-Level Security (RLS) policies to ensure you can only access your own data</li>
                      <li>• Encrypted connections (HTTPS/TLS)</li>
                      <li>• Secure authentication mechanisms</li>
                      <li>• Regular security audits and updates</li>
                    </ul>
                  </div>
                </section>

                {/* Your Rights */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Your Rights
                  </h3>
                  <div className="space-y-3 text-base font-semibold text-black dark:text-white">
                    <p>You have the right to:</p>
                    <ul className="space-y-2">
                      <li>• <strong>Access:</strong> View all data we have stored about you</li>
                      <li>• <strong>Modify:</strong> Update or correct your personal information</li>
                      <li>• <strong>Delete:</strong> Request deletion of your account and all associated data</li>
                      <li>• <strong>Export:</strong> Request a copy of your data</li>
                    </ul>
                  </div>
                </section>

                {/* Contact */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Contact Us
                  </h3>
                  <p className="text-base font-semibold text-black dark:text-white">
                    If you have any questions or concerns about this Privacy Policy, please contact the developer, Thomas George.
                  </p>
                </section>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="space-y-6">
                {/* Terms & Conditions Header */}
                <div className="border-[3px] border-black bg-green-400 p-6 dark:border-white">
                  <h2 className="text-3xl md:text-4xl font-black text-black mb-3 flex items-center gap-3">
                    <FileText size={32} />
                    Terms & Conditions
                  </h2>
                  <p className="text-base font-bold text-black">
                    Last Updated: February 8, 2026
                  </p>
                </div>

                {/* Acceptance */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Acceptance of Terms
                  </h3>
                  <p className="text-base font-semibold text-black dark:text-white leading-relaxed">
                    By creating an account and using BunkSafe, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use this application.
                  </p>
                </section>

                {/* Purpose of BunkSafe */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Purpose of BunkSafe
                  </h3>
                  <div className="border-[3px] border-black bg-blue-100 dark:bg-blue-900/30 dark:border-white p-4">
                    <p className="text-base font-semibold text-black dark:text-white leading-relaxed">
                      BunkSafe is an <strong>assistant tool</strong> designed to help students track their class attendance. It is <strong>NOT</strong> an official college attendance system.
                    </p>
                  </div>
                </section>

                {/* The Bunk Logic */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    The "Bunk Logic" Disclaimer
                  </h3>
                  <div className="border-[3px] border-black bg-yellow-100 dark:bg-yellow-900/30 dark:border-white p-4 space-y-3">
                    <p className="text-base font-semibold text-black dark:text-white leading-relaxed">
                      BunkSafe provides an <strong>estimated calculation</strong> called the "Bunk Logic" that suggests how many classes you can afford to miss while maintaining a target attendance percentage (typically 75%).
                    </p>
                    <div className="border-[3px] border-black bg-red-400 p-4">
                      <p className="text-base font-black text-black">
                        ⚠️ IMPORTANT: The Bunk Logic provides <strong>ESTIMATES ONLY</strong>. These calculations may not perfectly match your college&apos;s official attendance records.
                      </p>
                    </div>
                  </div>
                </section>

                {/* User Responsibility */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Your Responsibility
                  </h3>
                  <div className="space-y-4">
                    <div className="border-[3px] border-black bg-red-100 dark:bg-red-900/30 dark:border-white p-4">
                      <h4 className="text-xl font-black text-red-600 dark:text-red-400 mb-2">
                        You Are Solely Responsible
                      </h4>
                      <p className="text-base font-semibold text-black dark:text-white leading-relaxed">
                        <strong>YOU, the user, are SOLELY RESPONSIBLE for:</strong>
                      </p>
                      <ul className="mt-3 space-y-2 text-base font-semibold text-black dark:text-white">
                        <li>• Maintaining your actual college attendance according to your institution's rules</li>
                        <li>• Verifying your attendance with your college's official records</li>
                        <li>• Any academic consequences, including but not limited to debarment, detention, or academic penalties</li>
                        <li>• Ensuring accuracy of data you enter into BunkSafe</li>
                      </ul>
                    </div>

                    <div className="border-[3px] border-black bg-orange-100 dark:bg-orange-900/30 dark:border-white p-4">
                      <p className="text-base font-semibold text-black dark:text-white leading-relaxed">
                        BunkSafe is a <strong>personal tracking tool</strong> to help you stay aware of your attendance. It does not replace or interact with your college's official attendance system. Always cross-check with official records.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Limitation of Liability */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Limitation of Liability
                  </h3>
                  <div className="border-[3px] border-black bg-gray-100 dark:bg-gray-800 dark:border-white p-4">
                    <p className="text-base font-semibold text-black dark:text-white leading-relaxed">
                      <strong>Thomas George</strong> (the developer) and BunkSafe <strong>SHALL NOT BE HELD LIABLE</strong> for:
                    </p>
                    <ul className="mt-3 space-y-2 text-base font-semibold text-black dark:text-white">
                      <li>• Any discrepancies between BunkSafe data and official college records</li>
                      <li>• Academic consequences resulting from attendance issues</li>
                      <li>• Debarment, detention, or any disciplinary action by your educational institution</li>
                      <li>• Loss of data due to technical issues (though we strive to prevent this)</li>
                      <li>• Any damages, direct or indirect, arising from use of this application</li>
                    </ul>
                  </div>
                </section>

                {/* Proper Use */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Proper Use of the Application
                  </h3>
                  <p className="text-base font-semibold text-black dark:text-white leading-relaxed mb-3">
                    You agree to:
                  </p>
                  <ul className="space-y-2 text-base font-semibold text-black dark:text-white">
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 text-xl">✓</span>
                      <span>Use BunkSafe as a <strong>personal assistant tool</strong> for tracking attendance</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 text-xl">✓</span>
                      <span>Enter accurate and honest attendance data</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 text-xl">✓</span>
                      <span>Cross-verify with your college's official attendance records regularly</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 text-xl">✓</span>
                      <span>Keep your account credentials secure</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 text-xl">✗</span>
                      <span><strong>NOT</strong> rely solely on BunkSafe for critical attendance decisions</span>
                    </li>
                  </ul>
                </section>

                {/* GPS Watermark Feature */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    GPS Watermark Feature
                  </h3>
                  <div className="border-[3px] border-black bg-purple-100 dark:bg-purple-900/30 dark:border-white p-4">
                    <p className="text-base font-semibold text-black dark:text-white leading-relaxed">
                      The GPS Watermark feature allows you to capture attendance proofs with location stamps. By using this feature, you consent to:
                    </p>
                    <ul className="mt-3 space-y-2 text-base font-semibold text-black dark:text-white">
                      <li>• Sharing your GPS location at the time of capture</li>
                      <li>• Storage of location-stamped photos in our secure database</li>
                      <li>• Understanding that these proofs are for your personal records only</li>
                    </ul>
                  </div>
                </section>

                {/* Changes to Terms */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Changes to Terms
                  </h3>
                  <p className="text-base font-semibold text-black dark:text-white leading-relaxed">
                    We may update these Terms & Conditions from time to time. Continued use of BunkSafe after changes constitutes acceptance of the updated terms. Major changes will be communicated through the application.
                  </p>
                </section>

                {/* Contact */}
                <section>
                  <h3 className="text-2xl font-black text-black dark:text-white mb-3 border-b-[3px] border-black dark:border-white pb-2">
                    Contact
                  </h3>
                  <p className="text-base font-semibold text-black dark:text-white">
                    For questions about these Terms & Conditions, please contact Thomas George, the developer of BunkSafe.
                  </p>
                </section>

                {/* Final Acknowledgment */}
                <section>
                  <div className="border-[3px] border-black bg-green-100 dark:bg-green-900/30 dark:border-white p-4">
                    <p className="text-base font-black text-black dark:text-green-300 leading-relaxed">
                      By using BunkSafe, you acknowledge that you have read, understood, and agree to these Terms & Conditions, and that you accept full responsibility for your attendance management.
                    </p>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
