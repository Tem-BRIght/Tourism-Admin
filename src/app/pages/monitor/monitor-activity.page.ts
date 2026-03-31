import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

interface TourActivity {
  id: string;
  destination: string;
  guide: string;
  status: 'Active' | 'Completed';
  tourists: TouristInfo[];
}

interface TouristInfo {
  name: string;
  email: string;
}

interface ActivityFeed {
  id: string;
  title: string;
  time: string;
  type: string;
  icon: string;
}

@Component({
  selector: 'app-monitor-activity',
  templateUrl: './monitor-activity.page.html',
  styleUrls: ['./monitor-activity.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule]
})
export class MonitorActivityPage implements OnInit, OnDestroy {
  // Permission flags
  canViewLogs: boolean = false;
  canViewAnalytics: boolean = false;
  
  // UI states
  isLoading: boolean = false;
  autoRefresh: boolean = true;
  refreshInterval: any;
  showTouristModal: boolean = false;
  selectedTour: TourActivity | null = null;
  
  // Statistics
  stats = [
    { label: 'Active Tours Now', value: 24, change: '+3', icon: '🚌' },
    { label: 'Tourists On-site', value: 187, change: '+12', icon: '👥' },
    { label: 'Guides On Duty', value: 12, change: '+2', icon: '🎯' },
    { label: 'Peak Hours', value: '12-2 PM', change: 'Busy', icon: '⏰' }
  ];
  
  // Current Tours
  currentTours: TourActivity[] = [
    { 
      id: 'TUR-001', 
      destination: 'Pasig Museum', 
      guide: 'Bernard Panlilio', 
      status: 'Active',
      tourists: [
        { name: 'John Smith', email: 'john.s@email.com' },
        { name: 'Maria Santos', email: 'maria.s@email.com' },
        { name: 'David Lee', email: 'david.l@email.com' }
      ]
    },
    { 
      id: 'TUR-002', 
      destination: 'Rainforest Park', 
      guide: 'Irene Guevarra', 
      status: 'Active',
      tourists: [
        { name: 'Anna Reyes', email: 'anna.r@email.com' },
        { name: 'Pedro Cruz', email: 'pedro.c@email.com' },
        { name: 'Lisa Wong', email: 'lisa.w@email.com' },
        { name: 'James Tan', email: 'james.t@email.com' }
      ]
    },
    { 
      id: 'TUR-003', 
      destination: 'Ace Water Spa', 
      guide: 'Ramil Manandeg', 
      status: 'Completed',
      tourists: [
        { name: 'Carla Mercado', email: 'carla.m@email.com' },
        { name: 'Ben Torres', email: 'ben.t@email.com' }
      ]
    },
    { 
      id: 'TUR-004', 
      destination: 'Capitol Commons', 
      guide: 'Mike Rodriguez', 
      status: 'Active',
      tourists: [
        { name: 'Sofia Garcia', email: 'sofia.g@email.com' },
        { name: 'Carlos Mendoza', email: 'carlos.m@email.com' },
        { name: 'Elena Cruz', email: 'elena.c@email.com' },
        { name: 'Ramon Diaz', email: 'ramon.d@email.com' },
        { name: 'Tina Reyes', email: 'tina.r@email.com' }
      ]
    },
    { 
      id: 'TUR-005', 
      destination: 'Pasig Cathedral', 
      guide: 'Emma Wilson', 
      status: 'Completed',
      tourists: [
        { name: 'George Lopez', email: 'george.l@email.com' },
        { name: 'Linda Santos', email: 'linda.s@email.com' },
        { name: 'Robert Kim', email: 'robert.k@email.com' }
      ]
    }
  ];

  activities: ActivityFeed[] = [
    { id: 'ACT001', title: 'Tour started at Pasig Museum', time: '5 minutes ago', type: 'Started', icon: '▶️' },
    { id: 'ACT002', title: 'Guide assigned to Capitol Commons', time: '8 minutes ago', type: 'Assignment', icon: '👤' },
    { id: 'ACT003', title: 'Tour completed at Ace Water Spa', time: '15 minutes ago', type: 'Completed', icon: '✓' },
    { id: 'ACT004', title: 'New booking for Pasig Cathedral', time: '22 minutes ago', type: 'Booking', icon: '📅' },
    { id: 'ACT005', title: 'Tourists checked in at Rainforest Park', time: '2 minutes ago', type: 'Check-in', icon: '✅' },
    { id: 'ACT006', title: 'New feedback received', time: '30 minutes ago', type: 'Feedback', icon: '💬' }
  ];

  peakHours = [
    { hour: '8am - 10am', value: 45 },
    { hour: '10am - 12pm', value: 120 },
    { hour: '12pm - 2pm', value: 180 },
    { hour: '2pm - 4pm', value: 150 },
    { hour: '4pm - 6pm', value: 90 }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.setPermissions();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  // ============= PERMISSION FUNCTIONS =============
  setPermissions() {
    this.canViewLogs = this.authService.hasAccess({ table: 'system_logs', action: 'read' });
    this.canViewAnalytics = this.authService.hasAccess({ table: 'analytics_data', action: 'read' });
  }

  // ============= TOUR MANAGEMENT FUNCTIONS =============
  viewTourDetails(tour: TourActivity) {
    this.selectedTour = tour;
    this.showTouristModal = true;
  }

  closeModal() {
    this.showTouristModal = false;
    this.selectedTour = null;
  }

  // ============= REPORT GENERATION =============
  generateReport() {
    this.isLoading = true;
    
    setTimeout(() => {
      console.log('Generating Excel report...');
      
      const reportData = {
        generatedAt: new Date().toLocaleString(),
        summary: {
          activeTours: this.getActiveCount(),
          totalTourists: this.getTotalTourists(),
          guidesOnDuty: this.stats[2].value,
          peakHours: '12:00 PM - 2:00 PM'
        },
        tours: this.currentTours.map(tour => ({
          id: tour.id,
          destination: tour.destination,
          guide: tour.guide,
          status: tour.status,
          touristCount: tour.tourists.length
        })),
        activities: this.activities
      };
      
      this.generateExcel(reportData);
      this.isLoading = false;
    }, 1000);
  }

  generateExcel(data: any) {
    let csvContent = "MONITOR REAL-TIME ACTIVITY REPORT\n";
    csvContent += "Generated: " + data.generatedAt + "\n\n";
    
    csvContent += "SUMMARY STATISTICS\n";
    csvContent += "Active Tours Now," + data.summary.activeTours + "\n";
    csvContent += "Tourists On-site," + data.summary.totalTourists + "\n";
    csvContent += "Guides On Duty," + data.summary.guidesOnDuty + "\n";
    csvContent += "Peak Hours," + data.summary.peakHours + "\n\n";
    
    csvContent += "CURRENT TOURS\n";
    csvContent += "Tour ID,Destination,Tour Guide,Status,Tourists\n";
    data.tours.forEach((tour: any) => {
      csvContent += `${tour.id},${tour.destination},${tour.guide},${tour.status},${tour.touristCount}\n`;
    });
    
    csvContent += "\nLIVE ACTIVITY FEED\n";
    csvContent += "Event,Time,Type\n";
    data.activities.forEach((activity: any) => {
      csvContent += `${activity.title},${activity.time},${activity.type}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('Excel report generated successfully!');
  }

  getTotalTourists(): number {
    return this.currentTours.reduce((total, tour) => total + tour.tourists.length, 0);
  }

  // ============= AUTO-REFRESH FUNCTIONS =============
  startAutoRefresh() {
    if (this.autoRefresh) {
      this.refreshInterval = setInterval(() => {
        this.refreshData();
      }, 30000);
    }
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  refreshData() {
    console.log('Refreshing monitor data...');
  }

  // ============= STATISTICS FUNCTIONS =============
  getActiveCount(): number {
    return this.currentTours.filter(t => t.status === 'Active').length;
  }

  getCompletedCount(): number {
    return this.currentTours.filter(t => t.status === 'Completed').length;
  }

  // ============= NAVIGATION FUNCTIONS =============
  navigateTo(page: string) {
  const routes: { [key: string]: string } = {
    dashboard:           '/dashboard',
    bookings:            '/tourguide',
    feedback:            '/feedback-ratings',
    monitoring:          '/monitoring',
    'number-of-tourist': '/number-of-tourist',
    destinations:        '/destinations',
    'tour-guides':       '/tour-guides',
    users:               '/users',
  };
  if (!routes[page]) {
    console.warn(`navigateTo: unknown page "${page}"`);
    return;
  }
  this.router.navigate([routes[page]]);
}

  // ============= LOGOUT FUNCTION =============
  logout() {
    this.authService.logout();
  }
}