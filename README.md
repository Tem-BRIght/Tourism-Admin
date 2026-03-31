# Tourism Management System – Admin Panel

[![Ionic](https://img.shields.io/badge/Ionic-7-blue)](https://ionicframework.com/)
[![Angular](https://img.shields.io/badge/Angular-16-red)](https://angular.io/)
[![Firebase](https://img.shields.io/badge/Firebase-9-orange)](https://firebase.google.com/)

**A complete admin dashboard for managing tourist destinations, tour guides, bookings, and real‑time activity.** Built with Ionic Angular standalone components and Firebase.

![Dashboard Preview]<img width="1892" height="945" alt="image" src="https://github.com/user-attachments/assets/5a5f29d4-5835-4a72-9b4e-39b66630f0d6" /> <img width="1890" height="896" alt="image" src="https://github.com/user-attachments/assets/4910fcf5-eba7-41d4-9e73-d99cfcb9ccfa" /> <img width="1889" height="919" alt="image" src="https://github.com/user-attachments/assets/d306b120-febd-464b-9810-848b5476f74d" /> <img width="1891" height="861" alt="image" src="https://github.com/user-attachments/assets/ac4bfbde-c22e-407c-8729-948daaaafc25" /> <img width="1894" height="941" alt="image" src="https://github.com/user-attachments/assets/5300554d-9eea-41ba-b8c1-028917127c88" /> <img width="1890" height="943" alt="image" src="https://github.com/user-attachments/assets/194254c8-2709-4070-b17f-6dbf980af623" /> <img width="1897" height="922" alt="image" src="https://github.com/user-attachments/assets/917bb228-c908-4a91-8f2d-5922fed9eb75" /> <img width="1896" height="903" alt="image" src="https://github.com/user-attachments/assets/f77816ec-b1c6-4a58-b118-747c11b7189f" />

 <!-- Replace with actual screenshot -->

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
