import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, COMPANY_NAME, PRIVACY_CONTACT } from "@/lib/config";

export const metadata: Metadata = {
  title: `Data Deletion — ${APP_NAME}`,
  description: "How to ask us to delete the personal data we hold about you.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-teal-700 hover:underline">
          ← Back to {APP_NAME}
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
          Deleting your data
        </h1>

        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-gray-700">
          <p>
            You can ask us to delete the personal data we hold about you at any time, whether you
            ordered through our website, over WhatsApp, or by telephone. You do not need an account
            to make the request.
          </p>

          <h2 className="pt-4 text-xl font-semibold text-gray-900">How to make a request</h2>
          <p>
            {PRIVACY_CONTACT ? (
              <>
                Email us at{" "}
                <a className="text-teal-700 underline" href={`mailto:${PRIVACY_CONTACT}`}>
                  {PRIVACY_CONTACT}
                </a>{" "}
                with the subject line <strong>&quot;Data deletion request&quot;</strong>.
              </>
            ) : (
              <>
                Email our privacy contact with the subject line{" "}
                <strong>&quot;Data deletion request&quot;</strong>.
              </>
            )}{" "}
            So that we can find your records, please tell us the phone number you used to order, and
            the email address on your account if you have one.
          </p>
          <p>
            If you have an account on our website, you can also send the request from the address
            registered to it, which helps us confirm it is you.
          </p>

          <h2 className="pt-4 text-xl font-semibold text-gray-900">What we delete</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your name, phone number and email address</li>
            <li>Saved delivery addresses and delivery notes</li>
            <li>Any allergen and dietary information you gave us</li>
            <li>Your account, where you have one</li>
            <li>The record we hold of your conversations with our ordering assistant</li>
          </ul>
          <p>
            Message and call content is also processed by our artificial intelligence provider in
            order to understand your order. That provider keeps a short-term copy for its own
            security and abuse monitoring, on its own retention schedule and outside our control. We
            delete our copy, and the provider&apos;s copy expires on that schedule.
          </p>

          <h2 className="pt-4 text-xl font-semibold text-gray-900">What we may need to keep</h2>
          <p>
            We may have to retain a limited record of completed orders where accounting, tax or
            other legal obligations require it. Where that applies we remove the details that
            identify you, keeping only what the law requires. We will tell you if any data is
            retained on this basis and why.
          </p>
          <p>
            Restaurants that received your order are separate data controllers for the copy they
            hold. We will pass your request on to the relevant restaurant, and you may also contact
            it directly.
          </p>

          <h2 className="pt-4 text-xl font-semibold text-gray-900">How long it takes</h2>
          <p>
            We acknowledge requests promptly and complete them within one month, as required by
            applicable data protection law. If a request is unusually complex we may need longer, in
            which case we will tell you before the month is up.
          </p>

          <p className="pt-4">
            For the full picture of what we collect and why, see our{" "}
            <Link href="/privacy" className="text-teal-700 underline">
              Privacy Policy
            </Link>
            .{COMPANY_NAME ? ` ${APP_NAME} is operated by ${COMPANY_NAME}.` : ""}
          </p>
        </div>
      </div>
    </main>
  );
}
