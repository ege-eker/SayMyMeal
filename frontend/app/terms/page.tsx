import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, COMPANY_NAME, COMPANY_ADDRESS, PRIVACY_CONTACT } from "@/lib/config";

export const metadata: Metadata = {
  title: `Terms of Service — ${APP_NAME}`,
  description:
    "The terms on which you may use our ordering service across web, messaging and voice.",
};

const LAST_UPDATED = "31 August 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-teal-700 hover:underline">
          ← Back to {APP_NAME}
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

        <p className="mt-6 text-[15px] leading-relaxed text-gray-700">
          These terms govern your use of {APP_NAME}. By placing an order through our website, by
          messaging a restaurant that uses our service, or by calling one, you accept them. If you
          do not accept them, please do not use the service.
        </p>

        <Section title="Who we are">
          <p>
            {COMPANY_NAME ? (
              <>
                {APP_NAME} is operated by <strong>{COMPANY_NAME}</strong> (&quot;we&quot;,
                &quot;us&quot;).
              </>
            ) : (
              <>{APP_NAME} (&quot;we&quot;, &quot;us&quot;) operates this service.</>
            )}
          </p>
          {(COMPANY_ADDRESS || PRIVACY_CONTACT) && (
            <p>
              {COMPANY_ADDRESS && (
                <>
                  Registered address: {COMPANY_ADDRESS}
                  <br />
                </>
              )}
              {PRIVACY_CONTACT && (
                <>
                  Contact:{" "}
                  <a className="text-teal-700 underline" href={`mailto:${PRIVACY_CONTACT}`}>
                    {PRIVACY_CONTACT}
                  </a>
                </>
              )}
            </p>
          )}
        </Section>

        <Section title="What the service does">
          <p>
            We provide restaurants with an ordering service that their customers can use through a
            web page, through WhatsApp, or by telephone. An automated assistant presents the
            restaurant&apos;s menu, takes the order, and passes it to the restaurant.
          </p>
        </Section>

        <Section title="Our role — and what it is not">
          <p>
            We are an intermediary. <strong>Your order is a contract between you and the
            restaurant</strong>, not between you and us. The restaurant is the seller of the food.
            It is responsible for the accuracy of its menu and prices, for preparing your order, for
            food safety and hygiene, and for delivery where it offers it.
          </p>
          <p>
            We do not prepare, handle, inspect or deliver food, and we do not verify the information
            restaurants publish about their dishes.
          </p>
        </Section>

        <Section title="Allergens and food safety">
          <p>
            Where you tell us about allergies or dietary requirements, the assistant will check your
            order against the allergen information the restaurant has entered and warn you about a
            conflict before the order is placed. This is a convenience feature and{" "}
            <strong>it is not a guarantee</strong>.
          </p>
          <p>
            Allergen information comes from the restaurant, not from us. Kitchens handle many
            ingredients and cross-contamination is possible. If you have a serious allergy, speak to
            the restaurant directly before ordering and do not rely on the assistant alone.
          </p>
        </Section>

        <Section title="The automated assistant">
          <p>
            The assistant uses artificial intelligence and can misunderstand or make mistakes. It
            reads your order back to you for confirmation before it is placed — please check that
            summary, since it is what the restaurant will receive.
          </p>
          <p>
            If something looks wrong after an order is placed, contact the restaurant as soon as
            possible.
          </p>
        </Section>

        <Section title="Accounts">
          <p>
            You can order without an account. If you create one, keep your password confidential and
            tell us promptly if you believe someone else has used it. You are responsible for
            activity carried out through your account.
          </p>
          <p>
            Restaurant owners who connect a business account, a telephone number or a messaging
            number confirm that they are entitled to do so on behalf of that business and that the
            menu and business information they publish is accurate.
          </p>
        </Section>

        <Section title="Orders, prices and cancellation">
          <p>
            Prices, availability and delivery times are set by the restaurant and shown as it has
            entered them. Delivery estimates are estimates, not commitments.
          </p>
          <p>
            To change or cancel an order, contact the restaurant directly. Refunds and cancellations
            are the restaurant&apos;s decision under its own policy and applicable consumer law.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>place orders you do not intend to receive or pay for</li>
            <li>send abusive, threatening or unlawful content through any channel</li>
            <li>impersonate another person or use another person&apos;s contact details</li>
            <li>
              attempt to disrupt, overload, reverse engineer or gain unauthorised access to the
              service
            </li>
            <li>use the service for anything unlawful</li>
          </ul>
          <p>
            A restaurant may block a telephone number from ordering from it. We may suspend or end
            access where these terms are broken.
          </p>
        </Section>

        <Section title="Availability">
          <p>
            We aim to keep the service available but we do not promise it will be uninterrupted or
            error free. It depends on services we do not control, including messaging and telephony
            networks. We may change or withdraw features.
          </p>
        </Section>

        <Section title="Our liability">
          <p>
            Nothing in these terms limits liability that cannot lawfully be limited, including
            liability for death or personal injury caused by negligence, or for fraud.
          </p>
          <p>
            Subject to that, we are not liable for the quality, safety or delivery of food, which is
            the restaurant&apos;s responsibility, nor for loss arising from a restaurant&apos;s acts
            or omissions. We are not liable for indirect or consequential loss, and we are not
            liable for loss that was not reasonably foreseeable.
          </p>
          <p>
            If you are a consumer, you keep all rights given to you by law, and these terms do not
            affect them.
          </p>
        </Section>

        <Section title="Your data">
          <p>
            How we handle personal data is set out in our{" "}
            <Link href="/privacy" className="text-teal-700 underline">
              Privacy Policy
            </Link>
            . You can ask us to delete your data at any time — see{" "}
            <Link href="/data-deletion" className="text-teal-700 underline">
              Data Deletion
            </Link>
            .
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms. The version published here when you place an order is the one
            that applies to it. We will revise the date at the top when we make a change.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws of England and Wales, and the courts of England and
            Wales have jurisdiction. If you are a consumer resident elsewhere, you keep the
            protection of the mandatory rules of the country where you live.
          </p>
        </Section>
      </div>
    </main>
  );
}
