import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

// Define the Tourist interface
interface Tourist {
  name: string;
  email: string;
}

interface Booking {
  id: string;
  touristName: string;
  email: string;
  guideName: string;
  destination: string;
  tourDate: string;
  tourists: number;
  status: 'On-going' | 'Completed' | 'Cancelled';
  touristList?: Tourist[];
}

interface TouristInfo {
  name: string;
  email: string;
  destination: string;
  tourDate: string;
  guideName: string;
  tourists: number;
  touristList: Tourist[];
}

@Component({
  selector: 'app-tourguide',
  templateUrl: './tour-guide-page.html',
  styleUrls: ['./tour-guide-page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule]
})
export class TourGuidePage implements OnInit {
  // Permission flags
  canUpdateBooking: boolean = false;
  canDeleteBooking: boolean = false;
  
  // UI states
  isLoading: boolean = false;
  showTouristModal: boolean = false;
  selectedTourist: TouristInfo | null = null;
  
  // Filters
  filterName: string = '';
  filterDate: string = '';
  filterStatus: string = 'All';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 100;
  
  // Original complete bookings data with tourist lists
  allBookings: Booking[] = [
    { 
      id: '#TGB001', 
      touristName: 'Sarah Johnson', 
      email: 'sarah.j@email.com', 
      guideName: 'Mike Rodriguez', 
      destination: 'Pasig Cathedral', 
      tourDate: 'Mar 15, 2024', 
      tourists: 4, 
      status: 'On-going',
      touristList: [
        { name: 'Sarah Johnson', email: 'sarah.j@email.com' },
        { name: 'David Johnson', email: 'david.j@email.com' },
        { name: 'Emma Johnson', email: 'emma.j@email.com' },
        { name: 'Michael Johnson', email: 'michael.j@email.com' }
      ]
    },
    { 
      id: '#TGB002', 
      touristName: 'David Chen', 
      email: 'david.c@email.com', 
      guideName: 'Emma Wilson', 
      destination: 'Pasig Museum', 
      tourDate: 'Mar 20, 2024', 
      tourists: 2, 
      status: 'On-going',
      touristList: [
        { name: 'David Chen', email: 'david.c@email.com' },
        { name: 'Linda Chen', email: 'linda.c@email.com' }
      ]
    },
    { 
      id: '#TGB003', 
      touristName: 'Maria Garcia', 
      email: 'maria.g@email.com', 
      guideName: 'John Smith', 
      destination: 'Rainforest Park', 
      tourDate: 'Mar 25, 2024', 
      tourists: 6, 
      status: 'Completed',
      touristList: [
        { name: 'Maria Garcia', email: 'maria.g@email.com' },
        { name: 'Carlos Garcia', email: 'carlos.g@email.com' },
        { name: 'Ana Garcia', email: 'ana.g@email.com' },
        { name: 'Jose Garcia', email: 'jose.g@email.com' },
        { name: 'Elena Garcia', email: 'elena.g@email.com' },
        { name: 'Miguel Garcia', email: 'miguel.g@email.com' }
      ]
    },
    { 
      id: '#TGB004', 
      touristName: 'Robert Kim', 
      email: 'robert.k@email.com', 
      guideName: 'Lisa Anderson', 
      destination: 'Capitol Commons', 
      tourDate: 'Apr 2, 2024', 
      tourists: 3, 
      status: 'Cancelled',
      touristList: [
        { name: 'Robert Kim', email: 'robert.k@email.com' },
        { name: 'Susan Kim', email: 'susan.k@email.com' },
        { name: 'James Kim', email: 'james.k@email.com' }
      ]
    },
    { 
      id: '#TGB005', 
      touristName: 'Anna Santos', 
      email: 'anna.s@email.com', 
      guideName: 'Mike Rodriguez', 
      destination: 'Ace Water Spa', 
      tourDate: 'Apr 5, 2024', 
      tourists: 5, 
      status: 'On-going',
      touristList: [
        { name: 'Anna Santos', email: 'anna.s@email.com' },
        { name: 'Pedro Santos', email: 'pedro.s@email.com' },
        { name: 'Lucia Santos', email: 'lucia.s@email.com' },
        { name: 'Ramon Santos', email: 'ramon.s@email.com' },
        { name: 'Sofia Santos', email: 'sofia.s@email.com' }
      ]
    },
    { 
      id: '#TGB006', 
      touristName: 'John Reyes', 
      email: 'john.r@email.com', 
      guideName: 'Emma Wilson', 
      destination: 'Rainforest Park', 
      tourDate: 'Apr 8, 2024', 
      tourists: 8, 
      status: 'On-going',
      touristList: [
        { name: 'John Reyes', email: 'john.r@email.com' },
        { name: 'Mary Reyes', email: 'mary.r@email.com' },
        { name: 'Paul Reyes', email: 'paul.r@email.com' },
        { name: 'George Reyes', email: 'george.r@email.com' },
        { name: 'Rosa Reyes', email: 'rosa.r@email.com' },
        { name: 'Tony Reyes', email: 'tony.r@email.com' },
        { name: 'Carla Reyes', email: 'carla.r@email.com' },
        { name: 'Ben Reyes', email: 'ben.r@email.com' }
      ]
    },
    { 
      id: '#TGB007', 
      touristName: 'Maria Clara', 
      email: 'maria.c@email.com', 
      guideName: 'John Smith', 
      destination: 'Pasig Cathedral', 
      tourDate: 'Apr 10, 2024', 
      tourists: 3, 
      status: 'Completed',
      touristList: [
        { name: 'Maria Clara', email: 'maria.c@email.com' },
        { name: 'Jose Clara', email: 'jose.c@email.com' },
        { name: 'Ana Clara', email: 'ana.c@email.com' }
      ]
    }
  ];

  // Filtered bookings - will be updated by filters
  filteredBookings: Booking[] = [];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Initialize filteredBookings with all bookings
    this.filteredBookings = [...this.allBookings];
  }

  ngOnInit() {
    this.setPermissions();
    this.totalItems = this.allBookings.length;
  }

  // ============= PERMISSION FUNCTIONS =============
  setPermissions() {
    this.canUpdateBooking = this.authService.hasAccess({ table: 'bookings', action: 'update' });
    this.canDeleteBooking = this.authService.hasAccess({ table: 'bookings', action: 'delete' });
  }

  // ============= FILTER FUNCTIONS =============
  applyFilters() {
    this.isLoading = true;
    
    // Start with all bookings
    let filtered = [...this.allBookings];
    
    // Filter by Name (searches both tourist name and guide name)
    if (this.filterName && this.filterName.trim() !== '') {
      const searchTerm = this.filterName.toLowerCase().trim();
      filtered = filtered.filter(booking => 
        booking.touristName.toLowerCase().includes(searchTerm) ||
        booking.guideName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by Date
    if (this.filterDate && this.filterDate.trim() !== '') {
      const selectedDate = new Date(this.filterDate);
      const selectedDateStr = selectedDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      filtered = filtered.filter(booking => {
        // Parse booking date (e.g., "Mar 15, 2024")
        const [month, day, year] = booking.tourDate.replace(',', '').split(' ');
        const bookingDateStr = `${month} ${parseInt(day)}, ${year}`;
        return bookingDateStr === selectedDateStr;
      });
    }
    
    // Filter by Status
    if (this.filterStatus !== 'All') {
      filtered = filtered.filter(booking => booking.status === this.filterStatus);
    }
    
    // Update filteredBookings
    this.filteredBookings = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1; // Reset to first page
    
    // Simulate loading delay
    setTimeout(() => {
      this.isLoading = false;
    }, 300);
  }

  // Called when typing in name field (real-time)
  onNameFilterChange() {
    this.applyFilters();
  }

  // Called when date is selected
  onDateFilterChange() {
    this.applyFilters();
  }

  // Called when status is changed
  onStatusFilterChange() {
    this.applyFilters();
  }

  // Reset all filters
  resetFilters() {
    this.filterName = '';
    this.filterDate = '';
    this.filterStatus = 'All';
    this.filteredBookings = [...this.allBookings];
    this.totalItems = this.allBookings.length;
    this.currentPage = 1;
  }

  // ============= VIEW TOURIST INFORMATION =============
  viewTouristInfo(booking: Booking) {
    // Find the full booking with touristList from allBookings
    const fullBooking = this.allBookings.find(b => b.id === booking.id);
    
    this.selectedTourist = {
      name: booking.touristName,
      email: booking.email,
      destination: booking.destination,
      tourDate: booking.tourDate,
      guideName: booking.guideName,
      tourists: booking.tourists,
      touristList: fullBooking?.touristList || [{ name: booking.touristName, email: booking.email }]
    };
    this.showTouristModal = true;
  }

  closeModal() {
    this.showTouristModal = false;
    this.selectedTourist = null;
  }

  // ============= CANCEL BOOKING =============
  cancelBooking(bookingId: string) {
    if (this.canUpdateBooking && confirm('Are you sure you want to cancel this booking?')) {
      this.isLoading = true;
      
      setTimeout(() => {
        // Update in allBookings
        const bookingIndex = this.allBookings.findIndex(b => b.id === bookingId);
        if (bookingIndex !== -1) {
          this.allBookings[bookingIndex].status = 'Cancelled';
        }
        
        // Update in filteredBookings
        const filteredIndex = this.filteredBookings.findIndex(b => b.id === bookingId);
        if (filteredIndex !== -1) {
          this.filteredBookings[filteredIndex].status = 'Cancelled';
        }
        
        this.isLoading = false;
        this.applyFilters(); // Re-apply filters to ensure consistency
      }, 500);
    }
  }

  // ============= PAGINATION FUNCTIONS =============
  changePage(page: number) {
    this.currentPage = page;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.changePage(this.currentPage + 1);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.changePage(this.currentPage - 1);
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  getPageArray(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(this.totalPages, start + maxVisiblePages - 1);
    
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get paginatedBookings(): Booking[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredBookings.slice(start, end);
  }

  // ============= STATISTICS FUNCTIONS =============
  getTotalOngoing(): number {
    return this.filteredBookings.filter(b => b.status === 'On-going').length;
  }

  getTotalCompleted(): number {
    return this.filteredBookings.filter(b => b.status === 'Completed').length;
  }

  getTotalCancelled(): number {
    return this.filteredBookings.filter(b => b.status === 'Cancelled').length;
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