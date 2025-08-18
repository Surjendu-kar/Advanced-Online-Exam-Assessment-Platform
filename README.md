# Advanced Online Exam & Assessment Platform

## 🎯 Project Overview

Building a comprehensive online examination platform with advanced proctoring, multiple question types, and real-time code execution capabilities.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Animation**: Framer Motion
- **Payment**: Razorpay/Stripe
- **Code Execution**: Judge0 API
- **Proctoring**: WebRTC, MediaRecorder API

## 🚀 Development Approach

We're following a backend-first approach:
1. Build and test API endpoints with Postman
2. Create minimal UI components for testing
3. Implement full UI components

## 📋 Core Features (To be implemented)

### 1. Authentication & User Management
- User registration/login with Supabase Auth
- Role-based access (Student, Teacher, Admin)
- Profile management
- Password reset functionality

### 2. Exam Management
- Create/Edit/Delete exams
- Unique exam codes for restricted access
- Exam scheduling (start/end times)
- Exam settings (duration, attempts, proctoring level)
- Question bank management

### 3. Question Types
- **MCQ (Multiple Choice Questions)**
  - Question text with rich formatting
  - 4 options with single correct answer
  - Auto-grading
- **SAQ (Short Answer Questions)**
  - Text-based answers
  - Manual/semi-automatic grading
- **Coding Challenges**
  - Multiple programming languages
  - Real-time code execution via Judge0 API
  - Test case validation
  - Code editor with syntax highlighting

### 4. Proctoring Features
- Live webcam feed monitoring
- Tab switch detection
- Window focus tracking
- Copy-paste detection
- Multiple monitor detection
- Cheating alerts and logging
- Screen recording (optional)

### 5. Exam Taking Experience
- Secure exam interface
- Timer with auto-submit
- Question navigation
- Save draft answers
- Warning system for violations
- Fullscreen enforcement

### 6. Grading System
- Auto-grading for MCQ and Coding
- Manual grading interface for SAQ
- Partial marking support
- Grade calculation and weighting
- Grade release management

### 7. Analytics & Reporting
- Student performance analytics
- Exam statistics
- Leaderboard system
- Detailed reports for teachers
- Export functionality (PDF, Excel)

### 8. Payment Integration
- Subscription plans for teachers
- Pay-per-exam options
- Razorpay/Stripe integration
- Invoice generation

## 🧪 Testing

We're using Postman to test all API endpoints before implementing UI components.

## 📁 Project Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── api/
│   │   ├── auth/
│   │   ├── exams/
│   │   ├── judge0/
│   │   └── health/
│   └── globals.css
├── components/
├── lib/
│   ├── supabase/
│   ├── utils/
│   └── auth.ts
├── types/
└── public/
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.