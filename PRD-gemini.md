This document will serve as the single source of truth for the product team, guiding design, engineering, and testing efforts for the initial release.

---

# 📝 Product Requirements Document (PRD) - AV-Daily

| **Document Title** | **PRD: AV-Daily - Daily Savings & Contribution App** |
| :--- | :--- |
| **Version** | 1.0 (Initial Draft) |
| **Date** | October 21, 2025 |
| **Product Manager** | [Michael Obasi] |
| **Target Release** | Q2 2026 (MVP) |

---

## 1. 🎯 Goals and Objectives

### 1.1 Product Vision
To be the most reliable, secure, and user-friendly digital platform for small-scale entrepreneurs and daily wage earners to build consistent savings habits and access rotating thrift contributions, digitizing the traditional 'Akawo' or 'Esusu' model.

### 1.2 Business Goals
* **Acquisition:** Achieve 5,000 active users within the first 6 months post-launch.
* **Retention:** Achieve a 60% month-over-month active saver rate.
* **Revenue:** Establish a sustainable revenue stream through service fees on withdrawals/thrift cycles.
* **User Satisfaction:** Achieve an average app store rating of 4.5 or higher.

### 1.3 Success Metrics (Key Performance Indicators - KPIs)
| Metric Type | KPI | Measurement |
| :--- | :--- | :--- |
| **Acquisition** | **CPA** (Cost Per Acquisition) | Keep CPA below \$5.00 for the first 12 months. |
| **Engagement** | **Daily Active Savers** (DAS) | Percentage of registered users who make a contribution on any given day. |
| **Financial** | **Total Value Locked** (TVL) | Total cumulative amount saved by all users in the app. |
| **Feature Usage** | **% of Users with Auto-Save** | Percentage of active users who have enabled the automatic daily saving feature. |

---

## 2. 💡 Problem Statement and Target Audience

### 2.1 Problem Statement
Many small-scale traders, artisans, and daily wage earners struggle with the discipline of saving large lump sums and often rely on informal, unregulated, and sometimes insecure traditional daily contribution collectors (**DCCs**), leading to risk of fraud and lack of financial data to access formal credit.

### 2.2 Target Audience (User Persona)

| Persona Name | Background/Needs | Pain Points |
| :--- | :--- | :--- |
| **Adaeze, The Trader** | Age 35, runs a small stall in the market. Earns daily cash income. Needs to save a fixed amount (e.g., \$10) daily to accumulate capital for restocking every month. | Lack of physical security for cash; inconsistent DCC collection; no interest earned; no digital record of savings history. |
| **Bello, The Artisan** | Age 45, a skilled technician who gets paid upon project completion. Needs a structured way to contribute to a rotating group savings scheme (Ajo/Esusu) to get a lump sum for a major purchase (e.g., new equipment). | Difficulty organizing and trusting group members; manual collection is inefficient; high commission fees in the informal system. |

---

## 3. 🗺️ Product Scope & Features

**AV-Daily** will launch with two core savings products and a robust account management system.

### 3.1 Feature Overview

| Feature Category | Feature Name | Priority (MoSCoW) |
| :--- | :--- | :--- |
| **Onboarding** | Secure Registration & KYC | **Must Have** |
| **Core Savings** | Daily Personal Savings (**Flexi-Daily**) | **Must Have** |
| **Core Savings** | Group Rotating Savings (**Ajo/Esusu**) | **Should Have** |
| **Transactions** | Bank Account Integration (Fund & Withdraw) | **Must Have** |
| **User Management** | Savings History & Reports | **Must Have** |
| **Engagement** | Automated Daily Contributions | **Must Have** |
| **Engagement** | Goal Setting & Tracking | **Should Have** |

---

## 4. ⚙️ Functional Requirements

These define *what* the system must do to deliver the product features.

### 4.1 F-User Onboarding & Account Management

| ID | Requirement | Acceptance Criteria |
| :--- | :--- | :--- |
| **F.1.1** | The system shall allow users to register using their phone number and a secure password. | User receives an OTP via SMS to complete phone verification. |
| **F.1.2** | The system shall implement a tiered KYC (Know Your Customer) process. | **Tier 1 (Basic Savings):** Requires Full Name, Phone Number, DOB. **Tier 2 (High Limits/Thrift):** Requires Govt. Issued ID (e.g., National ID) and a clear ID photo/upload. |
| **F.1.3** | The system shall securely link the user's primary bank account for funding and withdrawals. | The user can successfully link an account via a secure third-party integration (e.g., Plaid, local equivalent) and verify a small test deposit/withdrawal. |

### 4.2 F-Core Savings: Flexi-Daily
This is the personal, daily fixed-amount savings feature (similar to traditional *Akawo*).

| ID | Requirement | Acceptance Criteria |
| :--- | :--- | :--- |
| **F.2.1** | The system shall allow a user to create a Flexi-Daily plan. | User can set a **Daily Contribution Amount** (min. \$1.00), a **Contribution Cycle** (e.g., 30 days, 60 days), and a **Target Payout Date**. |
| **F.2.2** | The system shall allow users to choose between manual or automatic daily contributions. | If **Auto-Save** is selected, the system shall debit the contribution amount from the linked bank account/wallet at a user-defined time (e.g., 9:00 AM) every day. |
| **F.2.3** | The system shall apply a clear withdrawal rule on the savings. | The saved principal and interest (if any) shall be available for withdrawal only upon completion of the defined **Contribution Cycle**. |
| **F.2.4** | The system shall clearly display the progress towards the user's goal. | The dashboard shall show: *Amount Saved / Target Amount* (e.g., \$150 / \$300) and *Days Remaining*. |

### 4.3 F-Group Contributions: Ajo/Esusu
This is the rotating savings and credit association (ROSCA) feature.

| ID | Requirement | Acceptance Criteria |
| :--- | :--- | :--- |
| **F.3.1** | The system shall allow a Tier 2 user (Organizer) to create a new Ajo Group. | Organizer can set: *Number of Members* (e.g., 10), *Contribution Amount* (e.g., \$50/day), *Contribution Frequency* (Daily/Weekly), and **Rotation Order** (Manual selection or Random). |
| **F.3.2** | The system shall allow the Organizer to invite members via a unique link or code. | Invited members can view the group details and accept/decline the invitation before the cycle starts. |
| **F.3.3** | The system shall manage the collection and payout of the lump sum to the chosen member. | On the designated collection day, the system shall automatically debit all members' wallets and disburse the lump sum (Total Contributions - Service Fee) to the member whose turn it is. |
| **F.3.4** | The system shall handle payment defaults by a group member. | The system shall notify all members and the Organizer, and follow the agreed-upon group rules (e.g., pause the cycle, group pays the default, or use a pre-paid security deposit). |

### 4.4 F-Wallet & Transaction Management

| ID | Requirement | Acceptance Criteria |
| :--- | :--- | :--- |
| **F.4.1** | The system shall maintain an in-app "AV-Wallet" for instant transactions. | Users can instantly fund their AV-Wallet via Bank Transfer (Virtual Account) or Debit Card. |
| **F.4.2** | The system shall allow users to withdraw funds from their Flexi-Daily or Ajo Payout to their linked bank account. | Withdrawal requests shall be processed within TBD business hours (Target: Instant). A transaction fee of TBD% will be applied. |
| **F.4.3** | The system shall provide a comprehensive transaction history. | Users can filter transactions by date range, type (Deposit, Contribution, Payout, Withdrawal), and search by amount. |

---

## 5. 🔒 Non-Functional Requirements (NFRs)

These define the quality attributes and constraints of the system.

| Category | ID | Requirement | Metric/Constraint |
| :--- | :--- | :--- | :--- |
| **Security** | **N.5.1** | All user data, especially financial data and credentials, shall be encrypted. | Use end-to-end encryption (E2EE) and tokenization for card details. Comply with relevant data protection regulations (e.g., GDPR, local financial regulations). |
| **Performance** | **N.5.2** | The application must load quickly and process daily debits efficiently. | Daily auto-save debits must be completed and reflected in the user's balance within **5 seconds** of the scheduled time. |
| **Usability (UX/UI)** | **N.5.3** | The interface shall be simple, intuitive, and designed for users with low digital literacy. | Minimum 90% of a test group can successfully set up a Flexi-Daily plan without assistance. Use clear iconography and a simplified flow. |
| **Reliability** | **N.5.4** | The core saving and withdrawal functions must be highly available. | Target uptime of **99.9%** for transaction services. |
| **Scalability** | **N.5.5** | The backend architecture must support rapid user growth. | The system should be able to handle up to **100,000 concurrent daily transactions** without performance degradation. |

---

## 6. 📱 Technical Requirements & Dependencies

### 6.1 Platform and Technology
* **Mobile Platforms:** iOS (Native/Swift) and Android (Native/Kotlin or Flutter/React Native for cross-platform efficiency).
* **Backend:** RESTful API architecture (e.g., Python/Django or Node.js/Express).
* **Database:** PostgreSQL or similar reliable, scalable relational database.
* **Hosting:** Vercel.

### 6.2 Key Integrations
* **Payment Gateway:** Integration with a local, regulated third-party payment processor (e.g., Paystack, Flutterwave, or a local bank API) for secure funding and withdrawals.
* **SMS Service:** Integration with a reliable SMS provider for OTP and critical transaction alerts.
* **Identity Verification:** Integration with a KYC/Identity verification service to authenticate government-issued IDs for Tier 2 access.

---

## 7. 🗓️ Timeline and Release Plan (MVP)

| Milestone | Target Completion Date | Scope/Deliverables |
| :--- | :--- | :--- |
| **Phase 1: Discovery & Design** | 6 Weeks | Finalized UI/UX Wireframes, Technical Architecture Design, Completed PRD. |
| **Phase 2: Core Development** | 12 Weeks | Functional MVP with **Flexi-Daily** feature, Basic Onboarding (Tier 1 KYC), and Instant Wallet Funding/Withdrawal. |
| **Phase 3: QA & Beta Testing** | 4 Weeks | Internal and closed external beta with 100 users, Security Audit sign-off. |
| **Phase 4: Launch (MVP v1.0)** | TBD (Post-QA Signoff) | Launch on both Google Play Store and Apple App Store. |
| **Phase 5: Feature Expansion** | 8 Weeks (Post-Launch) | Introduction of **Ajo/Esusu Group Contributions** feature (F.3.1 - F.3.4). |

---
