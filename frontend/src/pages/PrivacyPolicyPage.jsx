import { Link } from "react-router-dom";
import { ThemeSwitch } from "../ThemeSwitch.jsx";

// Public privacy policy (no sign-in needed) — linked from the Google Play
// listing for the Android app, so keep it reachable at /privacy-policy and
// keep it in step with what the app actually stores.
const EFFECTIVE_DATE = "7 October 2026";
const CONTACT_EMAIL = "hr@thewebsitemakers.in";

export function PrivacyPolicyPage() {
  return (
    <div className="policy-page">
      <header className="policy-chrome">
        <Link to="/login" className="policy-brand">
          <img className="login-logo" src="/twm-logo.jpg" alt="The Website Makers" />
          <div>
            <strong>TWM HRMS</strong>
            <p>People, leave, and payroll</p>
          </div>
        </Link>
        <ThemeSwitch />
      </header>

      <article className="policy-body">
        <h1>Privacy Policy</h1>
        <p className="muted">Effective date: {EFFECTIVE_DATE}</p>

        <p>
          This Privacy Policy explains how The Website Makers (“TWM”, “we”, “us”, “our”) collects, uses, stores and
          protects personal data in TWM HRMS (the “App”), available on the web and as an Android app. TWM HRMS is an
          internal human resources management system used only by TWM’s own employees, interns and authorised staff
          to manage attendance, leave, organisation details and payroll.
        </p>
        <p>
          The App is not offered to the general public. Accounts are created by TWM’s HR team; there is no public
          sign-up. By signing in, you acknowledge the practices described here.
        </p>

        <h2>1. Information we collect</h2>
        <p>We only collect information needed to run HR processes at TWM:</p>
        <ul>
          <li>
            <strong>Account details</strong> — your name, work email address, employee number, role, and a securely
            hashed password (we never store your password in plain text).
          </li>
          <li>
            <strong>Employment details</strong> — job title, department, team, reporting manager, leave approver,
            employment type (e.g. full time, intern/probation) and employment status.
          </li>
          <li>
            <strong>Attendance records</strong> — the times you clock in and clock out, including entries added by a
            manager for a missed punch.
          </li>
          <li>
            <strong>Leave and work-from-home records</strong> — request dates, type, reason you provide, approval
            decisions and comments, leave balances and monthly leave credits.
          </li>
          <li>
            <strong>Payroll information</strong> — salary structure, gross and net pay, PF/tax deductions, other pay
            line items and payslips.
          </li>
          <li>
            <strong>Activity and security logs</strong> — a record of actions taken in the App (who changed what and
            when), the IP address of the request, and your last sign-in time.
          </li>
        </ul>
        <p>
          The App does <strong>not</strong> access your location, camera, microphone, contacts, photos, SMS, call logs
          or other files on your device, and does not collect advertising identifiers.
        </p>

        <h2>2. How we use your information</h2>
        <ul>
          <li>To sign you in and keep your account secure.</li>
          <li>To record attendance and manage leave and work-from-home requests and approvals.</li>
          <li>To calculate salaries and generate payslips.</li>
          <li>To show the organisation structure, team calendar and company holidays to colleagues.</li>
          <li>
            To send service emails, such as password reset links and leave/work-from-home notifications to you, your
            approver and the HR team.
          </li>
          <li>To keep an audit trail, prevent misuse, and meet legal, tax and labour-law obligations.</li>
        </ul>
        <p>We do not use your data for advertising, marketing, profiling or automated decision-making.</p>

        <h2>3. Who can see your information</h2>
        <p>Access inside the App is limited by role:</p>
        <ul>
          <li>You can see your own profile, attendance, leave and payslips.</li>
          <li>Your reporting manager / team leader can see the attendance and leave of the people who report to them.</li>
          <li>HR, administrators and company owners can see company-wide records as needed for their job.</li>
          <li>
            Basic directory details (name, job title, department, team) and approved leave on the team calendar are
            visible to colleagues.
          </li>
        </ul>

        <h2>4. Sharing with third parties</h2>
        <p>
          We do <strong>not</strong> sell, rent or trade your personal data. We share data only with service providers
          that help us run the App, under confidentiality obligations:
        </p>
        <ul>
          <li>Our web hosting and database provider, which stores the App and its data.</li>
          <li>Our email provider, which delivers password reset and leave notification emails.</li>
        </ul>
        <p>
          We may also disclose information where required by law, court order or a government authority, or to
          protect the rights, safety and property of TWM and its employees.
        </p>

        <h2>5. Cookies and local storage</h2>
        <p>
          The App uses one essential, secure, HTTP-only cookie to keep you signed in, and your browser/app storage to
          remember your light/dark theme choice. We do not use analytics, tracking or advertising cookies.
        </p>

        <h2>6. Data security</h2>
        <ul>
          <li>All data is sent over encrypted HTTPS connections.</li>
          <li>Passwords are stored as one-way hashes; password reset links expire after a short time.</li>
          <li>Access to records is restricted by role, and changes are logged.</li>
        </ul>
        <p>
          No system is completely secure, but we take reasonable technical and organisational measures to protect
          your data against unauthorised access, loss or misuse.
        </p>

        <h2>7. Data retention</h2>
        <p>
          We keep your data for as long as you work with TWM. After you leave, your account is deactivated and you can
          no longer sign in. Attendance, leave and payroll records may be kept for the period required by applicable
          tax, accounting and labour laws, after which they are deleted or anonymised.
        </p>

        <h2 id="data-deletion">8. Your rights and data deletion</h2>
        <p>
          Subject to applicable law, including India’s Digital Personal Data Protection Act, 2023, you may ask to:
        </p>
        <ul>
          <li>access a copy of the personal data we hold about you;</li>
          <li>correct inaccurate or incomplete data;</li>
          <li>
            delete your account and associated personal data, except records we must keep by law (for example,
            payroll and tax records);
          </li>
          <li>raise a grievance about how your data is handled.</li>
        </ul>
        <p>
          To make a request, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from your
          work email with the subject “Privacy request”. We will respond within 30 days.
        </p>

        <h2>9. Children’s privacy</h2>
        <p>
          The App is meant only for TWM employees and staff who are 18 years or older. It is not directed at children,
          and we do not knowingly collect data from anyone under 18.
        </p>

        <h2>10. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The latest version will always be available on this page with
          its effective date, and significant changes will be communicated to employees.
        </p>

        <h2>11. Contact us</h2>
        <p>
          For any questions or grievances about this policy or your data, contact:
          <br />
          <strong>The Website Makers — HR Team</strong>
          <br />
          Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <br />
          Website: <a href="https://thewebsitemakers.in">thewebsitemakers.in</a>
        </p>

        <p className="policy-back">
          <Link to="/login">← Back to sign in</Link>
        </p>
      </article>
    </div>
  );
}
