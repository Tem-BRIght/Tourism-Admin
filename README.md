# Tourism Management System – Admin Panel

[![Ionic](https://img.shields.io/badge/Ionic-7-blue)](https://ionicframework.com/)
[![Angular](https://img.shields.io/badge/Angular-16-red)](https://angular.io/)
[![Firebase](https://img.shields.io/badge/Firebase-9-orange)](https://firebase.google.com/)

**A complete admin dashboard for managing tourist destinations, tour guides, bookings, and real‑time activity.** Built with Ionic Angular standalone components and Firebase.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Screenshot+Placeholder) <!-- Replace with actual screenshot -->

---

## ✨ Features

- **Dashboard** – Live statistics, peak hours chart, visitor growth, popular destinations.
- **Tour Guide Bookings** – View, filter, cancel bookings; see detailed tourist lists.
- **Feedback & Ratings** – Aggregate ratings, satisfaction scores, delete inappropriate reviews.
- **Real‑Time Activity Monitor** – Live map of destinations, active tours, activity feed.
- **Tourist/Tour Analytics** – Monthly trends, top destinations, quick stats.
- **Destination Management** – CRUD operations, image upload, location picker (Leaflet), QR code generation for each destination.
- **Tour Guide Management** – Add/edit guides, assign destinations, schedule tours.
- **User Management** – Complete user profiles with registration completeness validation.
- **Role‑based Access** – Superadmin, admin, and user permissions (fully implemented).

---

## 🛠️ Tech Stack

| Area               | Technology                                      |
|--------------------|-------------------------------------------------|
| Frontend           | Ionic 7 + Angular 16 (standalone components)    |
| Backend & Database | Firebase Firestore                              |
| Authentication     | Firebase Auth (email/password)                  |
| Storage            | Firebase Storage (destination images)           |
| Maps               | Leaflet + OpenStreetMap                         |
| Charts             | Custom CSS graphs (no extra library)            |
| QR Codes           | qrcode.js (CDN)                                 |
| Real‑time          | Firestore `onSnapshot`                          |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Ionic CLI: `npm install -g @ionic/cli`

### Installation

```bash
git clone https://github.com/your-username/tourism-admin-panel.git
cd tourism-admin-panel
npm install
