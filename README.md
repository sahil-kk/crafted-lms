# Crafted Learning Hub — LMS Platform

<p align="center">
  <img src="public/craftedlonglogo-with-tm.svg" alt="Crafted Logo" width="320" />
</p>

<p align="center">
  <strong>Comprehensive Learning Management System built for students, teachers, parents, and administrators.</strong>
</p>

<p align="center">
  <a href="https://study.craftedlearn.com">🌐 Live Application</a> •
  <a href="#key-features">✨ Key Features</a> •
  <a href="#tech-stack">🛠️ Tech Stack</a> •
  <a href="#architecture">🏛️ Architecture</a> •
  <a href="#getting-started">🚀 Getting Started</a>
</p>

---

## 🌟 Overview

**Crafted Learning Hub** is a fullstack ed-tech platform designed to unify tuition management, exam evaluation, student tracking, and parent communication into a single modern dashboard.

- 🎓 **Live Platform**: [study.craftedlearn.com](https://study.craftedlearn.com)
- 🔒 **Role-Based Portals**: Dedicated, secure workflows for **Students**, **Teachers**, **Parents**, and **Admins**.
- ⚡ **Real-Time Data**: Cloud-backed persistence powered by MongoDB Atlas and Cloudflare R2 object storage.

---

## ✨ Key Features

### 👨‍🎓 Student Portal
- **Interactive MCQ & Written Exams**: Timed interactive exam engine with live countdown, auto-submit, and immediate grade generation.
- **Embedded PDF Exam Viewer**: View uploaded exam papers and question sheets directly in the browser via Cloudflare R2 CDN.
- **Classes & Timetables**: Personalized schedule views, subject filters, and live class links.
- **Performance & Results Tracking**: Historical exam scores, grade trends, and analytics.

### 👩‍🏫 Teacher Portal
- **Exam & Question Bank Builder**: Create exams, attach PDF question papers, and configure MCQs with custom mark schemes.
- **Grade Management**: Grade submissions, record feedback, and track batch performance.
- **Parent-Teacher Messaging**: Direct asynchronous communication thread with parents regarding student progress.

### 👨‍👩‍👧 Parent Portal
- **Linked Student Monitoring**: Real-time visibility into student attendance, test results, and class links.
- **Parent Activity Controls**: Set daily study goals, manage weekend study permissions, and monitor practice test limits.
- **Direct Teacher Chat**: Reach out to assigned course teachers with inquiry threads.

### 🛡️ Admin Suite
- **Institutional Analytics**: Metrics on total enrollment, revenue, pending dues, and average score distributions.
- **User & Batch Provisioning**: Manage students, teachers, and parents with automated student ID generation (`C1001`, etc.).
- **Financial & Tuition Tracking**: Record fee payments, generate due dates, and track payment receipts.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org) with TypeScript & React 19
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) with Mongoose ORM
- **Object Storage**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (S3-compatible, zero egress fees)
- **Styling & UI**: Tailwind CSS, Radix UI primitives, Lucide Icons, and Sonner
- **Authentication**: JWT-based session tokens with role-based access control (RBAC) & rate-limiting protection
- **Deployment**: [Vercel](https://vercel.com)

---

## 🏛️ Architecture & Security Highlights

- **Role-Based Access Control (RBAC)**: All 39 API routes strictly enforce authentication and role authorization checks. Sensitive financial payments and destructive endpoints are restricted strictly to administrators.
- **Zero Exposed Secrets**: Strictly environment-driven configuration for database credentials, JWT secrets, and R2 S3 buckets.
- **Sanitized Responses**: Password hashes are automatically stripped from all response payloads across user provisioning endpoints.
- **Injection Mitigation**: Dynamic regex searches on usernames and student IDs are escaped to protect against regex injection / ReDoS attacks.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- MongoDB Atlas database cluster
- Cloudflare R2 bucket (or local fallback)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sahil-kk/crafted-lms.git
   cd crafted-lms
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory:
   ```env
   MONGO_URI="your-mongodb-atlas-connection-string"
   JWT_SECRET="your-secure-random-jwt-secret"
   NEXT_PUBLIC_API_URL=""

   # Cloudflare R2 Storage
   R2_ACCOUNT_ID="your-r2-account-id"
   R2_ACCESS_KEY_ID="your-r2-access-key-id"
   R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
   R2_BUCKET_NAME="crafted-uploads"
   R2_PUBLIC_URL="https://your-r2-public-url.r2.dev"
   ```

4. Run development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. Build for production:
   ```bash
   npm run build
   ```

---

## 📄 License

Copyright © 2026 Crafted Learning Hub. All Rights Reserved.  
Proprietary software. Unauthorized copying, modification, distribution, or commercial use of this code is strictly prohibited.
