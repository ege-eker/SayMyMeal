import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, COMPANY_NAME, COMPANY_ADDRESS, PRIVACY_CONTACT } from "@/lib/config";

export const metadata: Metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description:
    "How we collect, use, share and retain personal data across our web, WhatsApp and voice ordering channels.",
};

const LAST_UPDATED = "26 August 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-teal-700 hover:underline">
          ← Back to {APP_NAME}
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

        <p className="mt-6 text-[15px] leading-relaxed text-gray-700">
          This policy explains what personal data {APP_NAME} collects when you order food through
          our website, through WhatsApp, or by calling a restaurant that uses our service, why we
          collect it, who we share it with, and what rights you have.
        </p>

        <Section title="Who we are">
          <p>
            {COMPANY_NAME ? (
              <>
                {APP_NAME} is operated by <strong>{COMPANY_NAME}</strong> (&quot;we&quot;,
                &quot;us&quot;), which is the data controller for the personal data described in
                this policy.
              </>
            ) : (
              <>
                {APP_NAME} (&quot;we&quot;, &quot;us&quot;) is the data controller for the personal
                data described in this policy.
              </>
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
                  Privacy contact:{" "}
                  <a className="text-teal-700 underline" href={`mailto:${PRIVACY_CONTACT}`}>
                    {PRIVACY_CONTACT}
                  </a>
                </>
              )}
            </p>
          )}
          <p>
            Restaurants using our platform act as separate controllers for the order information
            they receive from us in order to prepare and deliver your order.
          </p>
        </Section>

        <Section title="What we collect">
          <p>What we hold depends on how you reach us.</p>

          <h3 className="pt-2 font-semibold text-gray-900">All ordering channels</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your name and phone number</li>
            <li>Your delivery address and any delivery notes you provide</li>
            <li>The items you order, the options you choose, prices and order history</li>
            <li>
              Allergen and dietary information, where you choose to give it, so that we can warn you
              about items that conflict with it
            </li>
          </ul>

          <h3 className="pt-2 font-semibold text-gray-900">Website accounts</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your email address and a protected (hashed) form of your password</li>
            <li>Delivery addresses you choose to save</li>
          </ul>

          <h3 className="pt-2 font-semibold text-gray-900">WhatsApp ordering</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Your WhatsApp phone number, and your WhatsApp profile name where it is made available
              to us
            </li>
            <li>The content of the messages you send to the restaurant&apos;s WhatsApp number</li>
            <li>
              Any voice messages you send, which are converted to text so that your order can be
              understood
            </li>
          </ul>
          <p>
            You do not need to create an account to order over WhatsApp. We keep a limited profile
            linked to your phone number so that your saved address and any allergen information are
            available on later orders.
          </p>

          <h3 className="pt-2 font-semibold text-gray-900">Voice ordering</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your caller phone number</li>
            <li>
              The audio of your call, which is processed so that the assistant can understand and
              respond to your order
            </li>
          </ul>

          <h3 className="pt-2 font-semibold text-gray-900">Abuse prevention</h3>
          <p>
            Where a restaurant blocks a phone number, we record that number and the reason given so
            that further orders from it can be refused.
          </p>
        </Section>

        <Section title="Allergen and dietary information">
          <p>
            Allergen information concerns your health. Both UK and Turkish data protection law treat
            this as a special category of personal data that requires additional protection.
          </p>
          <p>
            We record it only where you choose to provide it, and we use it for a single purpose: to
            check the items in your order against it and warn you before the order is placed. We do
            not use it for marketing or profiling, we do not use it to make automated decisions
            about you, and we do not share it with anyone other than the restaurant preparing your
            order.
          </p>
          <p>
            You may ask us to delete this information at any time, and you can continue to use the
            service without providing it.
          </p>
        </Section>

        <Section title="Our legal bases">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Performance of a contract</strong> — to take, confirm and pass on your order
              and to keep you informed about it.
            </li>
            <li>
              <strong>Explicit consent</strong> — for allergen and dietary information, which you
              provide voluntarily and may withdraw at any time.
            </li>
            <li>
              <strong>Legitimate interests</strong> — to prevent abusive or fraudulent orders and to
              keep the service secure and functioning correctly.
            </li>
            <li>
              <strong>Legal obligation</strong> — where we are required to retain records, for
              example for tax and accounting purposes.
            </li>
          </ul>
        </Section>

        <Section title="Who we share it with">
          <p>
            We do not sell your personal data and we do not use it for advertising. We share it only
            with the following categories of recipient.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>The restaurant you order from</strong> — your name, phone number, delivery
              address, order contents and any allergen warnings, so that it can prepare and deliver
              your order.
            </li>
            <li>
              <strong>OpenAI, L.L.C.</strong> — our artificial intelligence provider. The content of
              your messages, the text of your voice messages, and the audio of your phone calls are
              processed by OpenAI, together with the relevant restaurant&apos;s menu, so that the
              assistant can understand your order and reply to you. Account passwords and payment
              details are never sent.
            </li>
            <li>
              <strong>Meta Platforms Ireland Ltd.</strong> — where you order over WhatsApp, your
              messages are carried over the WhatsApp Business Platform. Meta&apos;s own{" "}
              <a
                className="text-teal-700 underline"
                href="https://www.whatsapp.com/legal/privacy-policy"
                target="_blank"
                rel="noreferrer"
              >
                privacy policy
              </a>{" "}
              also applies to that carriage.
            </li>
            <li>
              <strong>Twilio Inc.</strong> — carries voice calls to and from the restaurant&apos;s
              telephone number.
            </li>
            <li>
              <strong>Our hosting and infrastructure providers</strong> — which store and process
              the data on our behalf and under our instructions.
            </li>
          </ul>
        </Section>

        <Section title="Transfers outside the UK and Türkiye">
          <p>
            Some of the recipients above are established outside the UK and Türkiye, including in the
            United States. Where personal data is transferred internationally, we rely on the
            transfer safeguards required by applicable law, including standard contractual clauses
            with the recipient. You may request further details of these safeguards using the
            contact details above.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            We keep personal data only for as long as it is needed for the purposes described in
            this policy, and then delete it or render it anonymous.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              The working record of an ongoing WhatsApp or voice conversation is kept only while
              that conversation is active and is discarded shortly afterwards.
            </li>
            <li>
              Order records are kept so that you and the restaurant have a record of the order and
              so that we can meet our accounting and tax obligations.
            </li>
            <li>
              Accounts and saved profiles are kept until you ask us to delete them or close your
              account.
            </li>
            <li>Records of blocked numbers are kept for as long as needed to prevent repeat abuse.</li>
          </ul>
        </Section>

        <Section title="Your rights">
          <p>
            Subject to the conditions set out in applicable law, you have the right to access the
            personal data we hold about you, to have inaccurate data corrected, to have data
            deleted, to restrict or object to how we use it, to receive a copy in a portable format,
            and to withdraw consent where we rely on it.
          </p>
          <p>
            To exercise any of these rights, please contact us using the details above. If you are
            not satisfied with our response, you may complain to the UK Information
            Commissioner&apos;s Office (ico.org.uk) or, in Türkiye, to the Personal Data Protection
            Authority (kvkk.gov.tr).
          </p>
        </Section>

        <Section title="Security">
          <p>
            Passwords are stored only in a protected, non-reversible form. Traffic between your
            device and our servers is encrypted in transit, and access to production systems is
            limited to personnel who require it.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Our service is not directed at children and we do not knowingly collect personal data
            from anyone under 16. If you believe a child has provided us with personal data, please
            contact us and we will delete it.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we change how we use personal data we will update this page and revise the date shown
            at the top. Where changes are significant we will communicate them through the service.
          </p>
        </Section>
      </div>
    </main>
  );
}
