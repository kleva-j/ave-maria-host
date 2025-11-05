That's an excellent request. Merging these two documents creates a single, highly detailed, and comprehensive **Product Requirements Document (PRD)** for AV-Daily, combining the unique focus on the traditional African thrift model (*Akawo/Esusu*) with modern, gamified micro-saving features.

Here is the unified PRD.

---

# 📝 Product Requirements Document (PRD) - AV-Daily: Digital Daily Savings & Contribution App

| **Document Title** | **PRD: AV-Daily - Unified Daily Savings & Group Contributions** |
| :--- | :--- |
| **Version** | 1.0 (Unified Comprehensive Draft) |
| **Date** | November 3, 2025 |
| **Product Manager** | [Michael Obasi] |
| **Target Release** | Q2 2026 (MVP with Flexi-Daily) |
| **Status** | Finalized for Design & Engineering Kick-off |

---

## 1. 🎯 Product Vision, Goals, and Overview

### 1.1 Product Vision
To be the **most reliable, secure, and user-friendly digital platform** for small-scale entrepreneurs, daily wage earners, and general users to build consistent savings habits and access rotating thrift contributions, **digitizing the traditional 'Akawo' or 'Esusu' model** while empowering users to achieve personalized financial goals through small, consistent actions.

### 1.2 Product Purpose & Scope
The primary purpose is to empower users to save money daily without friction, fostering financial discipline and helping achieve goals (emergency funds, capital, etc.). It solves the problems of **inconsistent saving, reliance on insecure informal collectors (DCCs), and lack of a digital financial history.**

* **In Scope (MVP):** User registration, two core savings products (Flexi-Daily & Ajo/Esusu), bank integration for automated transfers, progress dashboards, goal setting, basic analytics, notifications, and a simple rewards system.
* **Out of Scope (for MVP):** Advanced investment options (e.g., stock purchases), cryptocurrency integration, multi-user family accounts, or physical card issuance.

### 1.3 Business Goals & OKRs
| Goal Type | Goal/Objective | Key Results (KRs) / Metrics (KPIs) |
| :--- | :--- | :--- |
| **Acquisition** | Achieve high market penetration and adoption. | KR: Reach **100,000 downloads** in the first year. KPI: Keep **CPA below \$5.00** for the first 12 months. |
| **Engagement** | Foster daily, consistent saving habits. | KR: Achieve **50% of users** making contributions on at least 5 days per week. KPI: **Daily Active Savers** (DAS) rate (Target: 60% M-o-M active saver rate). |
| **Financial** | Establish a sustainable, high-value platform. | KPI: **Total Value Locked (TVL)** (Total cumulative amount saved). Revenue stream through service fees on withdrawals/thrift cycles (Freemium model planned for advanced features). |
| **Satisfaction** | Ensure user satisfaction and retention. | KR: Attain a **70% retention rate** after 30 days. KPI: Maintain an average app store rating of **4.5 or higher**. |

---

## 2. 💡 Problem Statement and Target Audience

### 2.1 Consolidated Problem Statement
Many small-scale traders, artisans, and general users struggle with the discipline of saving large lump sums and often rely on informal, unregulated, and sometimes insecure traditional daily contribution collectors (**DCCs**), leading to a high **risk of fraud** and a **lack of financial data** to access formal credit. Furthermore, traditional savings apps lack the habit-forming features and local context (like 'Esusu/Akawo') needed for this audience.

### 2.2 Target Audience and Personas
The app targets **Adults aged 18-45** who have basic banking access but struggle with consistent saving, including young professionals, students, families, and specifically small-scale entrepreneurs and daily wage earners.

| Persona Name | Background/Needs | Pain Points Addressed by AV-Daily |
| :--- | :--- | :--- |
| **Adaeze, The Trader** | Age 35, runs a small market stall. Needs to save a fixed amount daily to accumulate capital for restocking every month (**Flexi-Daily** need). | Lack of physical security for cash; inconsistent DCC collection; no interest earned; no digital record of savings history. |
| **Bello, The Artisan** | Age 45, skilled technician. Needs a structured way to contribute to a rotating group savings scheme (**Ajo/Esusu** need) to get a lump sum for equipment. | Difficulty organizing and trusting group members; high commission fees in the informal system; manual collection inefficiency. |
| **Alex, The Professional** | Age 28, Marketing Coordinator. Needs to build an emergency fund of $5,000 in 12 months. | Busy schedule leads to forgotten manual transfers; needs reminders and effortless, automated setup. |

---

## 3. 🗺️ Product Scope & Features

**AV-Daily** will launch with two core savings products and a robust account management system.

### 3.1 Feature Prioritization (MoSCoW)
| Feature Category | Feature Name | Priority (MoSCoW) |
| :--- | :--- | :--- |
| **Onboarding** | Secure Registration, Tiered KYC & Bank Integration | **Must Have** |
| **Core Savings** | Daily Personal Savings (**Flexi-Daily**) | **Must Have** |
| **Engagement** | Automated Daily Contributions (Auto-Save) | **Must Have** |
| **User Mgmt** | Savings History & Progress Dashboard | **Must Have** |
| **Group Savings** | Group Rotating Savings (**Ajo/Esusu**) | **Should Have** (Phase 5) |
| **Engagement** | Goal Setting & Tracking | **Should Have** |
| **Engagement** | Analytics, Insights, & Rewards System | **Should Have** |
| **Transaction** | Round-up Contributions (Expense Integration) | Could Have |

---

## 4. ⚙️ Functional Requirements (FRs)

These define *what* the system must do to deliver the product features.

### 4.1 F-User Onboarding, Account Management & Wallet
| ID | Requirement | Acceptance Criteria |
| :--- | :--- | :--- |
| **F.1.1** | The system shall allow users to register using their phone number/email and a secure password. | User receives an OTP via SMS/email to complete verification. Biometric login (fingerprint/face ID) must be supported. |
| **F.1.2** | The system shall implement a tiered KYC (Know Your Customer) process. | **Tier 1 (Basic Savings):** Requires Full Name, Phone Number, DOB. **Tier 2 (High Limits/Thrift):** Requires Govt. Issued ID (e.g., National ID) and a clear ID photo/upload. |
| **F.1.3** | The system shall securely link the user's primary bank account for funding and withdrawals. | The user can successfully link an account via a secure third-party integration (e.g., Plaid, local equivalent). |
| **F.1.4** | The system shall maintain an in-app "AV-Wallet" for instant transactions and contributions. | Users can instantly fund their AV-Wallet via Bank Transfer (Virtual Account) or Debit Card. |

### 4.2 F-Core Savings: Flexi-Daily (Personal Savings)
| ID | Requirement | Acceptance Criteria |
| :--- | :--- | :--- |
| **F.2.1** | The system shall allow a user to create a Flexi-Daily plan. | User can set a **Daily Contribution Amount** (min. \$1.00), a **Contribution Cycle** (e.g., 30 days, 60 days), and a **Target Payout Date/Goal**. |
| **F.2.2** | The system shall allow users to choose between manual or automatic daily contributions. | If **Auto-Save** is selected, the system shall debit the contribution amount from the linked bank account/wallet at a user-defined time (e.g., 9:00 AM) every day. |
| **F.2.3** | The system shall apply a clear withdrawal rule on the savings. | The saved principal and interest (if any) shall be available for withdrawal only upon completion of the defined **Contribution Cycle**. Early withdrawal may incur a penalty. |
| **F.2.4** | The system shall clearly display the progress towards the user's goal. | The dashboard shall show: *Amount Saved / Target Amount* (e.g., \$150 / \$300), *Days Remaining*, and a visual progress bar. |

### 4.3 F-Group Contributions: Ajo/Esusu (ROSCA)
*This feature is prioritized as a **Should Have** (Phase 5).*

| ID | Requirement | Acceptance Criteria |
| :--- | :--- | :--- |
| **F.3.1** | The system shall allow a Tier 2 user (Organizer) to create a new Ajo Group. | Organizer can set: *Number of Members* (e.g., 10), *Contribution Amount* (e.g., \$50/day), *Contribution Frequency* (Daily/Weekly), and **Rotation Order** (Manual selection or Random). |
| **F.3.2** | The system shall manage the collection and payout of the lump sum to the chosen member. | The system shall automatically debit all members' wallets and disburse the lump sum (Total Contributions - Service Fee) to the member whose turn it is. |
| **F.3.3** | The system shall handle payment defaults by a group member. | The system shall notify all members and the Organizer, and follow the agreed-upon group rules (e.g., pause the cycle, group pays the default, or use a pre-paid security deposit). |

### 4.4 F-Engagement & Motivation
| ID | Requirement | Acceptance Criteria |
| :--- | :--- | :--- |
| **F.4.1** | The system shall provide weekly analytics and insights on saving streaks and habits. | User receives weekly summaries and AI-driven tips (e.g., "You saved $X more than last week" or "Increase by $0.50 to reach goal faster"). |
| **F.4.2** | The system shall incorporate a simple rewards system. | Users earn badges or small incentives (e.g., partner discounts) for consistent saving streaks (e.g., 7 days, 30 days). |
| **F.4.3** | The system shall provide notifications and reminders. | Push notifications must be sent daily to remind of contributions if automation fails or for important group events; customizable reminder times are supported. |

---

## 5. 🔒 Non-Functional Requirements (NFRs)

These define the quality attributes and constraints of the system.

| Category | ID | Requirement | Metric/Constraint |
| :--- | :--- | :--- | :--- |
| **Security** | **N.5.1** | All user and financial data shall be encrypted and compliant. | Use **end-to-end encryption (E2EE)** and tokenization for card details. Comply with GDPR/CCPA and local financial regulations. |
| **Performance** | **N.5.2** | The application must load quickly and process daily debits efficiently. | App loads in under **2 seconds**. Daily auto-save debits must be completed and reflected within **5 seconds** of the scheduled time. |
| **Usability (UX/UI)** | **N.5.3** | The interface shall be simple, intuitive, and designed for users with low digital literacy. | Minimum **90%** of a test group can set up a plan without assistance. Adhere to WCAG 2.1 (e.g., high contrast, screen reader compatibility). |
| **Reliability** | **N.5.4** | The core saving and withdrawal functions must be highly available. | Target uptime of **99.9%** for transaction services. |
| **Scalability** | **N.5.5** | The backend architecture must support rapid user growth. | The system should be able to handle up to **100,000 concurrent daily transactions** without performance degradation, scalable to 500,000 users. |

---

## 6. 📱 Technical Requirements & Dependencies

### 6.1 Platform and Technology
* **Mobile Platforms:** iOS (Swift/Native) and Android (Kotlin/Native).
* **Backend:** RESTful API architecture (e.g., Python/Django or Node.js/Express).
* **Database:** PostgreSQL (reliable, scalable relational database).
* **Hosting:** Cloud-based (e.g., AWS or Vercel).

### 6.2 Key Integrations
* **Payment Gateway:** Integration with a local, regulated third-party payment processor (e.g., Paystack, Flutterwave, or a local bank API) for secure funding and withdrawals. **Plaid/Stripe** or local equivalent for bank linking.
* **SMS/Notification Service:** Reliable SMS and Push notification provider (e.g., Firebase) for OTP and critical transaction alerts.
* **Identity Verification:** Integration with a KYC/Identity verification service to authenticate government-issued IDs for Tier 2 access.

---

## 7. 🗓️ Timeline and Release Plan (Roadmap)

The development will follow an Agile methodology with a planned 6-month launch timeline for the MVP.

| Milestone | Target Completion Date | Scope/Deliverables | Priority |
| :--- | :--- | :--- | :--- |
| **Phase 1: Discovery & Design** | 6 Weeks | Finalized UI/UX Wireframes, Technical Architecture Design, Completed PRD. | Must |
| **Phase 2: Core Development (MVP)** | 12 Weeks | Functional MVP with **Flexi-Daily** feature, Basic Onboarding (Tier 1 KYC), Instant Wallet Funding/Withdrawal, and Notifications. | Must |
| **Phase 3: QA & Beta Testing** | 4 Weeks | Internal and closed external beta with 100 users, Security Audit sign-off. | Must |
| **Phase 4: Launch (MVP v1.0)** | Q2 2026 | Launch on both Google Play Store and Apple App Store. | Must |
| **Phase 5: Feature Expansion (v1.1)** | 8 Weeks (Post-Launch) | Introduction of **Ajo/Esusu Group Contributions** feature (F.3.1 - F.3.3) and **Analytics/Rewards** (F.4.1 - F.4.2). | Should |

---

## 8. 🛡️ Risks and Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Data Breach** | High: Loss of user trust, financial/legal penalties. | Regular security audits and penetration testing; end-to-end encryption for all sensitive data (N.5.1). |
| **Low Adoption** | Medium: Failure to meet Business Goals (Acquisition/Retention). | Strong marketing campaigns focusing on the unique 'Akawo/Esusu' value proposition; user incentives and rewards (F.4.2). |
| **Integration Failures** | High: Inability to save or withdraw funds (Core Function). | Use tested, reputable, and regulated payment processors; build backup manual options if automated debits fail. |

---

Would you like to start with a detailed breakdown of the **User Onboarding and Tiered KYC flow** for the development team?
